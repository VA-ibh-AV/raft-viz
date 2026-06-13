import { useState, useEffect, useRef, useCallback } from 'react'
import {
  forceSimulation, forceManyBody, forceCenter,
  forceCollide, forceLink,
  zoom as d3Zoom, zoomIdentity, select,
} from 'd3'
import type { SimulationNodeDatum, ZoomBehavior } from 'd3'
import type {
  NodeSnapshot, LogEntry,
  TravelingMessage, NewLogEntry,
  CommittedEntry, NodeFlash,
} from '../types'
import { ServerIcon } from './ServerIcon'

/* ── Layout ─────────────────────────────────────────────────────────────── */

const CX = 400, CY = 300, RADIUS = 200

function circlePos(i: number, n: number) {
  const a = (2 * Math.PI * i / n) - Math.PI / 2
  return { x: CX + RADIUS * Math.cos(a), y: CY + RADIUS * Math.sin(a) }
}

/* ── D3 force layout ────────────────────────────────────────────────────── */

interface SimNode extends SimulationNodeDatum { id: number }
interface SimLink  { source: number; target: number }

function useForceLayout(nodeIds: number[]) {
  const posRef      = useRef<Record<number, { x: number; y: number }>>(
    Object.fromEntries(nodeIds.map((id, i) => [id, circlePos(i, nodeIds.length)]))
  )
  const simRef      = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null)
  const simNodesRef = useRef<SimNode[]>([])
  const [positions, setPositions] = useState(posRef.current)

  useEffect(() => {
    const total = nodeIds.length
    const nodes: SimNode[] = nodeIds.map((id, i) => ({
      id,
      x: posRef.current[id]?.x ?? circlePos(i, total).x,
      y: posRef.current[id]?.y ?? circlePos(i, total).y,
    }))

    const links: SimLink[] = []
    for (let i = 0; i < nodeIds.length; i++)
      for (let j = i + 1; j < nodeIds.length; j++)
        links.push({ source: nodeIds[i], target: nodeIds[j] })

    const sim = forceSimulation<SimNode>(nodes)
      .force('links', (forceLink<SimNode, SimLink>(links)
        .id(d => d.id).distance(280).strength(0.08)) as any)
      .force('charge', forceManyBody().strength(-2400))
      .force('center', forceCenter(CX, CY))
      .force('collide', forceCollide(105))
      .alphaDecay(0.015)
      .on('tick', () => {
        const next = Object.fromEntries(nodes.map(n => [n.id, { x: n.x!, y: n.y! }]))
        posRef.current = next
        setPositions({ ...next })
      })

    simRef.current      = sim
    simNodesRef.current = nodes

    return () => { sim.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds.join(',')])

  return { positions, simRef, simNodesRef }
}

/* ── Message interpolation ──────────────────────────────────────────────── */

function interpolate(
  msg: TravelingMessage,
  pos: Record<number, { x: number; y: number }>,
  now?: number,
) {
  const f = pos[msg.fromNode], t = pos[msg.toNode]
  if (!f || !t) return null
  const raw = Math.min(1, ((now ?? performance.now()) - msg.startedAt) / msg.duration)
  const e   = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
  return { x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e }
}

const MSG_COL: Record<string, string> = {
  vote:      '#60A5FA',
  append:    '#3B82F6',
  heartbeat: '#3B82F6',
}

/* ── Coordinate helper ──────────────────────────────────────────────────── */

function clientToContent(
  e: React.PointerEvent,
  svg: SVGSVGElement,
  z: { k: number; x: number; y: number },
) {
  const rect = svg.getBoundingClientRect()
  const svgX = (e.clientX - rect.left) * (800 / rect.width)
  const svgY = (e.clientY - rect.top)  * (600 / rect.height)
  return { x: (svgX - z.x) / z.k, y: (svgY - z.y) / z.k }
}

/* ── SVG Defs ───────────────────────────────────────────────────────────── */

function Defs() {
  return (
    <defs>
      {/* Message dot glow */}
      <filter id="f-dot" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      {/* Background radial */}
      <radialGradient id="bg-radial" cx="50%" cy="40%" r="70%">
        <stop offset="0%"   style={{ stopColor: 'var(--canvas-bg-1)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--canvas-bg-2)' }} />
      </radialGradient>

      {/* Server card sheen (top highlight) */}
      <linearGradient id="server-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="white" stopOpacity="0.10" />
        <stop offset="100%" stopColor="white" stopOpacity="0"    />
      </linearGradient>

      {/* Grid */}
      <pattern id="grid-dots" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="24" cy="24" r="0.9" style={{ fill: 'var(--grid-col)' }} />
      </pattern>
    </defs>
  )
}

/* ── Log panel ──────────────────────────────────────────────────────────── */

function LogPanel({ log, commitIndex, x, y, newEntries, flashEntries }: {
  log:          LogEntry[]
  commitIndex:  number
  x:            number
  y:            number
  newEntries:   Set<number>
  flashEntries: Set<number>
}) {
  const visible = [...log].reverse().slice(0, 3)
  if (visible.length === 0) return null
  const W = 96
  return (
    <g style={{ pointerEvents: 'none' }}>
      {visible.map((e, i) => {
        const committed = e.index <= commitIndex
        const cls = newEntries.has(e.index)   ? 'log-entry-new'
                  : flashEntries.has(e.index) ? 'log-commit-flash'
                  : undefined
        return (
          <g key={e.index} transform={`translate(${x + 7},${y + i * 17})`}>
            <rect width={W} height={14} rx={3}
              className={cls}
              style={{ fill: committed ? 'var(--log-committed)' : 'var(--log-pending)' }}
              stroke={committed ? 'var(--log-idx-c)' : 'var(--border)'}
              strokeWidth={1}
            />
            <text x={5} y={10.5}
              style={{ fill: committed ? 'var(--log-idx-c)' : 'var(--log-idx-p)' }}
              fontSize={9} fontFamily="ui-monospace,monospace">[{e.index}]</text>
            <text x={26} y={10.5}
              style={{ fill: committed ? 'var(--log-text-c)' : 'var(--log-text-p)' }}
              fontSize={9} fontFamily="ui-monospace,monospace">
              {e.command.slice(0, 10)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* ── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  nodes:            NodeSnapshot[]
  onNodeClick:      (id: number, alive: boolean) => void
  onNodeRemove:     (id: number) => void
  messages:         TravelingMessage[]
  newLogEntries:    NewLogEntry[]
  committedEntries: CommittedEntry[]
  nodeFlashes:      NodeFlash[]
  resetZoomRef?:    { current: (() => void) | null }
}

/* ── Canvas ─────────────────────────────────────────────────────────────── */

export function ClusterCanvas({
  nodes, onNodeClick, onNodeRemove,
  messages, newLogEntries, committedEntries, nodeFlashes,
  resetZoomRef,
}: Props) {
  const nodeIds = nodes.map(n => n.id)

  const { positions, simRef, simNodesRef } = useForceLayout(nodeIds)

  /* zoom */
  const svgRef      = useRef<SVGSVGElement>(null)
  const zoomRef     = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const zoomXformRef = useRef({ k: 1, x: 0, y: 0 })
  const [xform, setXform] = useState('translate(0,0) scale(1)')

  useEffect(() => {
    if (!svgRef.current) return
    const z = d3Zoom<SVGSVGElement, unknown>()
      /* don't start zoom/pan when the pointer is on a draggable node */
      .filter(ev => !(ev.target as Element).closest('[data-drag]'))
      .scaleExtent([0.25, 4])
      .on('zoom', ev => {
        const t = ev.transform
        zoomXformRef.current = { k: t.k, x: t.x, y: t.y }
        setXform(t.toString())
      })
    zoomRef.current = z
    select(svgRef.current).call(z)
    if (resetZoomRef)
      resetZoomRef.current = () =>
        select(svgRef.current!).transition().duration(350).call(z.transform, zoomIdentity)
    return () => { select(svgRef.current!).on('.zoom', null) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* rAF loop for message dots */
  const [, setTick] = useState(0)
  const rafRef = useRef<number | null>(null)
  const hasMsgs = messages.length > 0
  useEffect(() => {
    if (!hasMsgs) { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; return }
    const loop = () => { setTick(n => n + 1); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [hasMsgs])

  /* track new nodes for entrance animation */
  const prevIdsRef = useRef<Set<number>>(new Set())
  const [entering, setEntering] = useState<Set<number>>(new Set())
  useEffect(() => {
    const prev  = prevIdsRef.current
    const added = nodeIds.filter(id => !prev.has(id))
    prevIdsRef.current = new Set(nodeIds)
    if (!added.length) return
    setEntering(new Set(added))
    const t = setTimeout(() => setEntering(new Set()), 450)
    return () => clearTimeout(t)
  }, [nodeIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  /* drag state */
  const dragRef = useRef<{
    nodeId: number; startX: number; startY: number; moved: boolean
  } | null>(null)

  const startDrag = useCallback((e: React.PointerEvent, nodeId: number) => {
    e.preventDefault()
    document.body.style.userSelect = 'none'
    if (!svgRef.current) return
    const { x, y } = clientToContent(e, svgRef.current, zoomXformRef.current)
    const n = simNodesRef.current.find(n => n.id === nodeId)
    if (n) { n.fx = n.x ?? x; n.fy = n.y ?? y }
    simRef.current?.alphaTarget(0.3).restart()
    dragRef.current = { nodeId, startX: x, startY: y, moved: false }
  }, [simRef, simNodesRef])

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return
    const { x, y } = clientToContent(e, svgRef.current, zoomXformRef.current)
    const d = dragRef.current
    const dx = x - d.startX, dy = y - d.startY
    if (!d.moved && Math.sqrt(dx * dx + dy * dy) > 4) d.moved = true
    if (d.moved) {
      const n = simNodesRef.current.find(n => n.id === d.nodeId)
      if (n) { n.fx = x; n.fy = y }
    }
  }, [simNodesRef])

  const handleUp = useCallback(() => {
    document.body.style.userSelect = ''
    if (!dragRef.current) return
    const n = simNodesRef.current.find(n => n.id === dragRef.current!.nodeId)
    if (n) { n.fx = null; n.fy = null }
    simRef.current?.alphaTarget(0)
    dragRef.current = null
  }, [simRef, simNodesRef])

  /* hover state for action buttons */
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  /* animation maps */
  const newByNode: Record<number, Set<number>> = {}
  for (const e of newLogEntries) (newByNode[e.nodeId] ??= new Set()).add(e.logIndex)

  const flashByNode: Record<number, Set<number>> = {}
  for (const e of committedEntries) {
    const nd  = nodes.find(n => n.id === e.nodeId)
    const set = (flashByNode[e.nodeId] ??= new Set())
    nd?.log.filter(l => l.index <= e.commitIndex).forEach(l => set.add(l.index))
  }

  const flashKind: Record<number, NodeFlash['kind']> = {}
  for (const f of nodeFlashes) flashKind[f.nodeId] = f.kind

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 600"
      width="100%"
      height="100%"
      style={{ display: 'block', cursor: 'grab' }}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onDoubleClick={() =>
        svgRef.current && zoomRef.current &&
        select(svgRef.current).transition().duration(350).call(zoomRef.current.transform, zoomIdentity)
      }
    >
      <Defs />

      {/* Background radial — outside zoom transform so it always fills */}
      <rect x={0} y={0} width={800} height={600} fill="url(#bg-radial)" />

      <g transform={xform}>
        {/* Grid */}
        <rect x={-5000} y={-5000} width={11000} height={11000} fill="url(#grid-dots)" />

        {/* Edges — leader-spoke only (avoids n² mesh clutter) */}
        {(() => {
          const leader = nodes.find(n => n.role === 'LEADER' && n.alive)
          if (!leader) return null
          const lp = positions[leader.id]
          if (!lp) return null
          return nodes.filter(n => n.id !== leader.id).map(peer => {
            const pp = positions[peer.id]
            if (!pp) return null
            const alive = peer.alive
            return (
              <line
                key={`edge-${leader.id}-${peer.id}`}
                x1={lp.x} y1={lp.y}
                x2={pp.x} y2={pp.y}
                stroke={alive ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={1.2}
                strokeDasharray={alive ? '6 7' : '2 6'}
                opacity={alive ? 0.4 : 0.15}
                className={alive ? 'edge-flow' : undefined}
                style={{ pointerEvents: 'none' }}
              />
            )
          })
        })()}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = positions[node.id]
          if (!pos) return null
          const isHovered = hoveredNode === node.id && !dragRef.current
          const panelX = pos.x - 55
          const panelY = pos.y + 58

          return (
            <g key={node.id}
              data-drag="true"
              className={entering.has(node.id) ? 'node-enter' : undefined}
              style={entering.has(node.id) ? { transformOrigin: `${pos.x}px ${pos.y}px` } : undefined}
              onPointerDown={e => startDrag(e, node.id)}
              onPointerEnter={() => setHoveredNode(node.id)}
              onPointerLeave={() => { if (!dragRef.current) setHoveredNode(null) }}
            >
              <g transform={`translate(${pos.x},${pos.y})`}>
                <ServerIcon node={node} flashKind={flashKind[node.id]} />
              </g>

              {/* ── Hover action buttons ──────────────────────────────── */}

              {/* Kill — alive + hovered */}
              {node.alive && isHovered && (
                <g transform={`translate(${pos.x - 52}, ${pos.y - 44})`}
                   style={{ cursor: 'pointer' }}
                   onPointerDown={e => e.stopPropagation()}
                   onClick={e => { e.stopPropagation(); onNodeClick(node.id, true) }}>
                  <title>crash node N{node.id}</title>
                  <circle r={11} fill="var(--surface)" stroke="var(--red)" strokeWidth={1.4} />
                  <text textAnchor="middle" y={4}
                    style={{ fill: 'var(--red)' }}
                    fontSize={11} fontFamily="ui-monospace,monospace">⏻</text>
                </g>
              )}

              {/* Revive — dead + hovered */}
              {!node.alive && isHovered && (
                <g transform={`translate(${pos.x}, ${pos.y})`}
                   style={{ cursor: 'pointer' }}
                   onPointerDown={e => e.stopPropagation()}
                   onClick={e => { e.stopPropagation(); onNodeClick(node.id, false) }}>
                  <title>revive node N{node.id}</title>
                  <circle r={20} fill="var(--surface)" stroke="var(--purple)" strokeWidth={1.6} opacity={0.95} />
                  <text textAnchor="middle" y={6}
                    style={{ fill: 'var(--purple)' }}
                    fontSize={15} fontFamily="ui-monospace,monospace">↺</text>
                </g>
              )}

              {/* Remove — alive + hovered */}
              {node.alive && isHovered && (
                <g transform={`translate(${pos.x + 52}, ${pos.y - 44})`}
                   style={{ cursor: 'pointer' }}
                   onPointerDown={e => e.stopPropagation()}
                   onClick={e => { e.stopPropagation(); onNodeRemove(node.id) }}>
                  <title>remove N{node.id}</title>
                  <circle r={11} fill="var(--surface)" stroke="var(--border2)" strokeWidth={1.2} />
                  <text textAnchor="middle" y={4}
                    style={{ fill: 'var(--text3)' }}
                    fontSize={13} fontFamily="ui-monospace,monospace">−</text>
                </g>
              )}

              {/* Log panel */}
              {node.alive && (
                <LogPanel
                  log={node.log ?? []}
                  commitIndex={node.commitIndex ?? 0}
                  x={panelX} y={panelY}
                  newEntries={newByNode[node.id] ?? new Set()}
                  flashEntries={flashByNode[node.id] ?? new Set()}
                />
              )}
            </g>
          )
        })}

        {/* Traveling RPC / heartbeat dots */}
        {messages.map(msg => {
          const now    = performance.now()
          const p      = interpolate(msg, positions, now)
          if (!p) return null
          const col    = MSG_COL[msg.kind] ?? '#94A3B8'
          const isHb   = msg.kind === 'heartbeat'
          const dotR   = isHb ? 6 : 7
          const dotOp  = isHb ? 0.9 : 1.0
          const trail1 = interpolate(msg, positions, now - 60)
          const trail2 = interpolate(msg, positions, now - 130)
          return (
            <g key={msg.id} style={{ pointerEvents: 'none' }}>
              {trail2 && <circle cx={trail2.x} cy={trail2.y} r={dotR * 0.55} fill={col} opacity={0.18} />}
              {trail1 && <circle cx={trail1.x} cy={trail1.y} r={dotR * 0.8} fill={col} opacity={0.4} />}
              <circle cx={p.x} cy={p.y} r={dotR} fill={col} opacity={dotOp}
                filter="url(#f-dot)" />
              <circle cx={p.x} cy={p.y} r={dotR + 3} fill="none"
                stroke={col} strokeWidth={1} opacity={0.4} />
              {!isHb && (
                <text x={p.x + 9} y={p.y - 6} fill={col} fontSize={10}
                  fontFamily="ui-monospace,monospace" fontWeight={700} opacity={0.9}>
                  {msg.kind === 'vote' ? 'vote' : 'ae'}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
