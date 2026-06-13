import type { NodeSnapshot } from '../types'

interface Props {
  nodes:    NodeSnapshot[]
  onKill:   (id: number) => void
  onRevive: (id: number) => void
  onAdd:    () => void
  onSubmit: (cmd: string) => void
}

export function ScenarioBar({ nodes, onKill, onRevive, onAdd, onSubmit }: Props) {
  const leader     = nodes.find(n => n.role === 'LEADER' && n.alive)
  const aliveCount = nodes.filter(n => n.alive).length
  const dead       = nodes.filter(n => !n.alive)

  const killLeader = () => leader && onKill(leader.id)
  const reviveOne  = () => dead[0] && onRevive(dead[0].id)
  const burstWrite = () => {
    const cmds = ['SET x=1', 'SET y=2', 'SET z=3', 'INCR counter', 'PUT a=foo']
    cmds.forEach((c, i) => setTimeout(() => onSubmit(c), i * 200))
  }

  const scenarios = [
    {
      label:    'Trigger election',
      hint:     'Kill the leader; watch a new one get elected',
      icon:     '⚡',
      color:    '#F59E0B',
      onClick:  killLeader,
      disabled: !leader,
    },
    {
      label:    'Revive a node',
      hint:     dead[0] ? `Bring N${dead[0].id} back online` : 'No dead nodes to revive',
      icon:     '↺',
      color:    '#8B5CF6',
      onClick:  reviveOne,
      disabled: dead.length === 0,
    },
    {
      label:    'Burst writes',
      hint:     'Send 5 commands rapidly — see replication',
      icon:     '▸',
      color:    '#3B82F6',
      onClick:  burstWrite,
      disabled: !leader,
    },
    {
      label:    'Add a node',
      hint:     aliveCount >= 7 ? 'Cluster is at max (7)' : 'Grow the cluster — recalc quorum',
      icon:     '⊕',
      color:    '#10B981',
      onClick:  onAdd,
      disabled: aliveCount >= 7,
    },
  ]

  return (
    <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
        padding: 0,
      }}>
        {scenarios.map(s => (
          <button
            key={s.label}
            onClick={s.onClick}
            disabled={s.disabled}
            className="btn scenario-btn"
            title={s.hint}
            style={{
              padding: '12px 13px',
              background: 'var(--surface)',
              border: 'none',
              cursor: s.disabled ? 'not-allowed' : 'pointer',
              opacity: s.disabled ? 0.4 : 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: 5,
              textAlign: 'left',
              minHeight: 70,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 16, color: s.color, lineHeight: 1,
                width: 18, textAlign: 'center',
              }}>
                {s.icon}
              </span>
              <span style={{
                fontSize: 13, color: 'var(--text)', fontWeight: 700,
              }}>
                {s.label}
              </span>
            </div>
            <span style={{
              fontSize: 11, color: 'var(--text3)',
              lineHeight: 1.4,
            }}>
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
