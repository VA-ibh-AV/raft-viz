import type { NodeSnapshot } from '../types'
import { clusterPhase } from '../lib/narrate'

interface Props { nodes: NodeSnapshot[] }

export function PhaseBanner({ nodes }: Props) {
  const phase  = clusterPhase(nodes)
  const total  = nodes.length
  const alive  = nodes.filter(n => n.alive).length
  const quorum = Math.floor(total / 2) + 1

  let title  = ''
  let detail = ''
  let color  = '#3B82F6'
  let icon: React.ReactNode = null

  switch (phase.kind) {
    case 'stable':
      title  = `Stable — N${phase.leader.id} leading`
      detail = `term ${phase.leader.term} · ${alive}/${total} alive · quorum ${quorum}`
      color  = '#3B82F6'
      icon   = <Dot color={color} pulse />
      break
    case 'election':
      title  = 'Election in progress'
      detail = `${phase.candidates.map(c => `N${c.id}`).join(', ')} running for leader`
      color  = '#F59E0B'
      icon   = <Spinner color={color} />
      break
    case 'no_leader':
      title  = 'No leader yet'
      detail = `Cluster booting — waiting for first election`
      color  = '#64748B'
      icon   = <Dot color={color} />
      break
    case 'no_quorum':
      title  = 'Quorum lost'
      detail = `Only ${phase.alive}/${total} alive — need ${phase.needed} to make progress`
      color  = '#EF4444'
      icon   = <Warn />
      break
    case 'empty':
      title  = 'Connecting…'
      detail = 'No nodes reporting yet'
      color  = '#64748B'
      icon   = <Dot color={color} />
      break
  }

  return (
    <div style={{
      position: 'absolute', top: 16, left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 18px',
      background: 'var(--surface)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: `1px solid ${color}55`,
      borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `0 4px 20px ${color}22, 0 0 0 1px var(--border)`,
      zIndex: 5, pointerEvents: 'none',
    }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.02em',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--text3)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {detail}
        </span>
      </div>
    </div>
  )
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={pulse ? 'status-live' : undefined}
      style={{
        width: 9, height: 9, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}AA`,
        flexShrink: 0,
      }}
    />
  )
}

function Spinner({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" fill="none"
        stroke={`${color}33`} strokeWidth="1.5" />
      <circle cx="7" cy="7" r="5.5" fill="none"
        stroke={color} strokeWidth="1.5"
        strokeDasharray="8 30" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 7 7" to="360 7 7" dur="0.9s" repeatCount="indefinite"/>
      </circle>
    </svg>
  )
}

function Warn() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <path d="M7 1 L13 12 L1 12 Z" fill="#EF444433" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="6.3" y="5" width="1.4" height="4" rx="0.5" fill="#EF4444"/>
      <circle cx="7" cy="10.5" r="0.8" fill="#EF4444"/>
    </svg>
  )
}
