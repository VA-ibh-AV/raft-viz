import type { NodeSnapshot, LogEntry } from '../types'

// ── Dynamic layout ────────────────────────────────────────────────────────────
// Nodes are arranged in a circle. Position is determined by the node's
// index in the array so the layout reflows cleanly as nodes are added/removed.

const CX = 300, CY = 190, RADIUS = 125

function circlePos(index: number, total: number) {
  // Start at the top (−90°) and go clockwise
  const angle = (2 * Math.PI * index / total) - Math.PI / 2
  return {
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle),
  }
}

const ROLE_FILL: Record<string, string> = {
  FOLLOWER:  '#334155',
  CANDIDATE: '#92400E',
  LEADER:    '#14532D',
}
const ROLE_STROKE: Record<string, string> = {
  FOLLOWER:  '#475569',
  CANDIDATE: '#F59E0B',
  LEADER:    '#22C55E',
}

// ── Log panel (SVG) ───────────────────────────────────────────────────────────

function LogPanel({ log, commitIndex, x, y }: {
  log: LogEntry[], commitIndex: number, x: number, y: number
}) {
  const visible = [...log].reverse().slice(0, 4)
  return (
    <g>
      <text x={x + 53} y={y - 3} textAnchor="middle"
        fill="#334155" fontSize={9} fontFamily="ui-monospace,monospace">log</text>
      {visible.length === 0 && (
        <text x={x + 53} y={y + 12} textAnchor="middle"
          fill="#1E293B" fontSize={9} fontFamily="ui-monospace,monospace">empty</text>
      )}
      {visible.map((e, i) => {
        const committed = e.index <= commitIndex
        return (
          <g key={e.index} transform={`translate(${x},${y + i * 21})`}>
            <rect width={106} height={17} rx={3}
              fill={committed ? '#14532D' : '#1E293B'}
              stroke={committed ? '#22C55E55' : '#33415555'} strokeWidth={1}
            />
            <text x={4} y={12} fill="#64748B"
              fontSize={9} fontFamily="ui-monospace,monospace">[{e.index}]</text>
            <text x={30} y={12} fill={committed ? '#4ADE80' : '#94A3B8'}
              fontSize={9} fontFamily="ui-monospace,monospace">
              {e.command.slice(0, 10)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ── Main canvas ───────────────────────────────────────────────────────────────

interface Props {
  nodes:        NodeSnapshot[]
  onNodeClick:  (id: number, alive: boolean) => void
  onNodeRemove: (id: number) => void
}

export function ClusterCanvas({ nodes, onNodeClick, onNodeRemove }: Props) {
  const total = nodes.length

  // Build position map: nodeId → {x, y}
  const positions = Object.fromEntries(
    nodes.map((n, i) => [n.id, circlePos(i, total)])
  )

  // Edges — connect every pair
  const edges: [number, number][] = []
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      edges.push([nodes[i].id, nodes[j].id])

  return (
    <svg viewBox="0 0 600 500" width="100%" style={{ maxWidth: 580 }}>

      {/* Edges */}
      {edges.map(([a, b]) => {
        const pa = positions[a], pb = positions[b]
        return pa && pb ? (
          <line key={`${a}-${b}`}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke="#1E293B" strokeWidth={2} strokeDasharray="6 4"
          />
        ) : null
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const pos   = positions[node.id]
        if (!pos) return null
        const alive = node.alive
        const role  = node.role

        const panelX = pos.x - 53
        const panelY = pos.y + 56

        return (
          <g key={node.id}>

            {/* ── Circle ── */}
            <g transform={`translate(${pos.x},${pos.y})`}
               onClick={() => onNodeClick(node.id, alive)}
               style={{ cursor: 'pointer' }}>
              <title>{alive ? 'click to kill' : 'click to revive'}</title>

              {alive && role === 'LEADER' && (
                <circle r={58} fill="none" stroke="#22C55E"
                  strokeWidth={1.5} opacity={0.25} />
              )}
              {alive && role === 'CANDIDATE' && (
                <circle r={56} fill="none" stroke="#F59E0B"
                  strokeWidth={1} opacity={0.3} strokeDasharray="4 3" />
              )}

              <circle r={48}
                fill={alive ? (ROLE_FILL[role] ?? '#334155') : '#0F172A'}
                stroke={alive ? (ROLE_STROKE[role] ?? '#475569') : '#374151'}
                strokeWidth={alive ? 2 : 1.5}
                strokeDasharray={alive ? undefined : '5 3'}
                opacity={alive ? 1 : 0.55}
              />

              {alive ? (
                <>
                  <text textAnchor="middle" y={-10} fill="white"
                    fontSize={18} fontWeight={700} fontFamily="ui-monospace,monospace">
                    N{node.id}
                  </text>
                  <text textAnchor="middle" y={9}
                    fill={ROLE_STROKE[role] ?? '#475569'}
                    fontSize={10} fontFamily="ui-monospace,monospace">
                    {role.toLowerCase()}
                  </text>
                  <text textAnchor="middle" y={25} fill="#64748B"
                    fontSize={9} fontFamily="ui-monospace,monospace">
                    term {node.term}
                  </text>
                </>
              ) : (
                <>
                  <text textAnchor="middle" y={6} fill="#4B5563"
                    fontSize={26} fontFamily="ui-monospace,monospace">✕</text>
                  <text textAnchor="middle" y={26} fill="#374151"
                    fontSize={9} fontFamily="ui-monospace,monospace">
                    N{node.id} offline
                  </text>
                </>
              )}
            </g>

            {/* ── Remove button (top-right of circle) ── */}
            {alive && (
              <g
                transform={`translate(${pos.x + 34}, ${pos.y - 34})`}
                onClick={e => { e.stopPropagation(); onNodeRemove(node.id) }}
                style={{ cursor: 'pointer' }}
              >
                <title>remove node {node.id} from cluster</title>
                <circle r={10} fill="#1E293B" stroke="#475569" strokeWidth={1} />
                <text textAnchor="middle" y={4} fill="#94A3B8"
                  fontSize={11} fontFamily="ui-monospace,monospace">−</text>
              </g>
            )}

            {/* ── Log panel ── */}
            {alive && (
              <LogPanel
                log={node.log ?? []}
                commitIndex={node.commitIndex ?? 0}
                x={panelX}
                y={panelY}
              />
            )}

          </g>
        )
      })}
    </svg>
  )
}