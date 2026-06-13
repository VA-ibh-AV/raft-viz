import type { RaftEvent } from '../types'

const TYPE_COLOR: Record<string, string> = {
  role_changed:  '#22C55E',
  vote_granted:  '#60A5FA',
  node_killed:   '#EF4444',
  node_revived:  '#A78BFA',
  log_appended:  '#F59E0B',
  log_committed: '#34D399',
  node_added:    '#818CF8',
  node_removed:  '#F87171',
}

const TYPE_LABEL: Record<string, string> = {
  role_changed:  'role changed',
  vote_granted:  'vote granted',
  node_killed:   'node killed',
  node_revived:  'node revived',
  log_appended:  'log appended',
  log_committed: 'log committed',
  node_added:    'node added',
  node_removed:  'node removed',
}

function describe(e: RaftEvent): string {
  switch (e.type) {
    case 'role_changed':  return `N${e.nodeId} → ${e.role?.toLowerCase()}`
    case 'vote_granted':  return `N${e.nodeId} voted for N${e.votedFor}`
    case 'node_killed':   return `N${e.nodeId} went offline`
    case 'node_revived':  return `N${e.nodeId} came back online`
    case 'log_appended':  return `N${e.nodeId} ← [${e.logIndex}] ${e.command}`
    case 'log_committed': return `N${e.nodeId} committed ≤ ${e.commitIndex}`
    case 'node_added':    return `N${e.nodeId} joined the cluster`
    case 'node_removed':  return `N${e.nodeId} left the cluster`
    default:              return `N${e.nodeId}`
  }
}

interface Props { events: RaftEvent[] }

export function EventLog({ events }: Props) {
  return (
    <div style={{
      width: 220, minWidth: 220, background: '#080D13',
      borderLeft: '1px solid #1E293B',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #1E293B',
        fontSize: 11, fontFamily: 'ui-monospace, monospace',
        color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        event log
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {events.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 11,
            fontFamily: 'ui-monospace, monospace', color: '#1E293B' }}>
            waiting…
          </div>
        )}
        {events.map((e, i) => (
          <div key={i} style={{ padding: '6px 14px', borderBottom: '1px solid #0F172A' }}>
            <div style={{
              fontSize: 10, fontFamily: 'ui-monospace, monospace',
              color: TYPE_COLOR[e.type] ?? '#94A3B8', marginBottom: 2,
            }}>
              {TYPE_LABEL[e.type] ?? e.type}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#CBD5E1' }}>
              {describe(e)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}