import { useState } from 'react'
import { useCluster }  from './hooks/useCluster'
import { useControls } from './hooks/useControls'
import { ClusterCanvas } from './components/ClusterCanvas'
import { EventLog }      from './components/EventLog'

export default function App() {
  const { nodes, events, connected } = useCluster('ws://localhost:8080/ws')
  const { kill, revive, submit, addNode, removeNode } = useControls()
  const [cmd, setCmd] = useState('')

  const handleNodeClick = (id: number, alive: boolean) => {
    if (alive) kill(id)
    else       revive(id)
  }

  const handleSubmit = () => {
    const c = cmd.trim()
    if (c) { submit(c); setCmd('') }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0F1117', color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: '1px solid #1E293B', flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontWeight: 600,
          fontSize: 14, color: '#E2E8F0',
        }}>
          raft visualizer
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Add node button */}
          <button
            onClick={() => addNode()}
            disabled={nodes.filter(n => n.alive).length >= 7}
            style={{
              background: '#1E293B', border: '1px solid #334155',
              color: '#94A3B8', padding: '4px 12px', borderRadius: 4,
              fontSize: 12, fontFamily: 'ui-monospace, monospace',
              cursor: 'pointer',
            }}
          >
            + add node
          </button>

          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22C55E' : '#EF4444', display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#475569' }}>
              {connected ? 'connected' : 'reconnecting…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Hint ── */}
      <div style={{
        textAlign: 'center', padding: '4px', fontSize: 11,
        fontFamily: 'ui-monospace, monospace', color: '#334155',
        borderBottom: '1px solid #1E293B',
      }}>
        click node to kill · click offline to revive · − to remove from cluster
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '1rem',
        }}>
          <ClusterCanvas
            nodes={nodes}
            onNodeClick={handleNodeClick}
            onNodeRemove={removeNode}
          />
        </div>
        <EventLog events={events} />
      </div>

      {/* ── Submit bar ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 20px',
        borderTop: '1px solid #1E293B', flexShrink: 0, background: '#080D13',
      }}>
        <input
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder='command — e.g.  SET x 1'
          style={{
            flex: 1, background: '#0F172A', border: '1px solid #1E293B',
            borderRadius: 4, color: '#E2E8F0', padding: '5px 10px',
            fontSize: 12, fontFamily: 'ui-monospace, monospace', outline: 'none',
          }}
        />
        <button onClick={handleSubmit} style={{
          background: '#14532D', border: '1px solid #22C55E55',
          color: '#4ADE80', padding: '5px 14px', borderRadius: 4,
          fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer',
        }}>
          submit
        </button>
      </div>

    </div>
  )
}