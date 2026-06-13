import { useState } from 'react'
import type { RaftEvent, NodeSnapshot } from '../types'
import type { Timing } from '../hooks/useControls'
import { Commentary }      from './Commentary'
import { ScenarioBar }     from './ScenarioBar'
import { TimingControls }  from './TimingControls'

const ROLE_COL: Record<string, string> = {
  LEADER:    '#3B82F6',
  CANDIDATE: '#F59E0B',
  FOLLOWER:  '#64748B',
}

function NodeChip({ node }: { node: NodeSnapshot }) {
  const col = node.alive ? (ROLE_COL[node.role] ?? '#64748B') : 'var(--border)'
  return (
    <div title={node.alive ? `N${node.id} · ${node.role.toLowerCase()} · term ${node.term}` : `N${node.id} · offline`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: node.alive ? `${col}14` : 'var(--surface2)',
        border: `1px solid ${node.alive ? `${col}44` : 'var(--border)'}`,
        borderRadius: 7,
        opacity: node.alive ? 1 : 0.55,
      }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: col,
        boxShadow: node.alive && node.role === 'LEADER' ? `0 0 6px ${col}` : 'none',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 13, fontWeight: 700, color: 'var(--text)',
        fontFamily: 'ui-monospace, monospace',
      }}>
        N{node.id}
      </span>
    </div>
  )
}

function ClusterStrip({ nodes }: { nodes: NodeSnapshot[] }) {
  if (nodes.length === 0) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace' }}>
        connecting…
      </div>
    )
  }
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', flexWrap: 'wrap', gap: 6,
    }}>
      {nodes.map(n => <NodeChip key={n.id} node={n} />)}
    </div>
  )
}

function SectionHeader({ label, badge, icon, action, onClick }: {
  label:    string
  badge?:   number
  icon?:    React.ReactNode
  action?:  React.ReactNode
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{
          fontSize: 12, color: 'var(--text2)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
        }}>
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span style={{
            fontSize: 10, color: 'var(--text2)',
            padding: '2px 7px', borderRadius: 10,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
          }}>
            {badge}
          </span>
        )}
      </div>
      {action}
    </Tag>
  )
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

function IconCluster() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="3" r="2" fill="var(--accent)"/>
      <circle cx="3" cy="10" r="2" fill="var(--accent)"/>
      <circle cx="11" cy="10" r="2" fill="var(--accent)"/>
      <line x1="7" y1="3" x2="3" y2="10" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1"/>
      <line x1="7" y1="3" x2="11" y2="10" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1"/>
      <line x1="3" y1="10" x2="11" y2="10" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1"/>
    </svg>
  )
}
function IconBolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8 1 L3 8 L7 8 L6 13 L11 6 L7 6 Z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="0.8" strokeLinejoin="round"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="var(--accent2)" strokeWidth="1.5"/>
      <path d="M7 4 L7 7 L9.5 8.2" stroke="var(--accent2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function IconFeed() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="11" r="1.5" fill="#10B981"/>
      <path d="M3 7.5 C3 5.5 4.5 4 6.5 4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M3 4 C3 3 4 2 5 2 C8.5 2 11.5 5 11.5 8.5 C11.5 9.5 10.5 10.5 9.5 10.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.65"/>
    </svg>
  )
}
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
      <path d="M3 4.5 L6 7.5 L9 4.5" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

interface Props {
  events:    RaftEvent[]
  nodes:     NodeSnapshot[]
  onKill:    (id: number) => void
  onRevive:  (id: number) => void
  onAdd:     () => void
  onSubmit:  (cmd: string) => void
  getTiming: () => Promise<Timing>
  setTiming: (t: Timing) => Promise<Timing>
}

export function EventLog({ events, nodes, onKill, onRevive, onAdd, onSubmit, getTiming, setTiming }: Props) {
  const [openScenarios, setOpenScenarios] = useState(true)
  const [openTiming,    setOpenTiming]    = useState(false)

  return (
    <aside style={{
      width: 360, minWidth: 360,
      background: 'var(--sidebar-bg)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Cluster chips */}
      <SectionHeader
        label="cluster"
        badge={nodes.filter(n => n.alive).length}
        icon={<IconCluster />}
      />
      <ClusterStrip nodes={nodes} />

      {/* Scenarios — collapsible */}
      <SectionHeader
        label="try it"
        icon={<IconBolt />}
        onClick={() => setOpenScenarios(o => !o)}
        action={<Chevron open={openScenarios} />}
      />
      {openScenarios && (
        <ScenarioBar
          nodes={nodes}
          onKill={onKill}
          onRevive={onRevive}
          onAdd={onAdd}
          onSubmit={onSubmit}
        />
      )}

      {/* Timing — collapsible */}
      <SectionHeader
        label="timing"
        icon={<IconClock />}
        onClick={() => setOpenTiming(o => !o)}
        action={<Chevron open={openTiming} />}
      />
      {openTiming && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <TimingControls getTiming={getTiming} setTiming={setTiming} />
        </div>
      )}

      {/* Live commentary — main scrolling area */}
      <SectionHeader
        label="live commentary"
        badge={events.length}
        icon={<IconFeed />}
      />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
        <Commentary events={events} nodes={nodes} />
      </div>
    </aside>
  )
}
