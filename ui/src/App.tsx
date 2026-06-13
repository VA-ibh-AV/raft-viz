import { useState, useEffect, useRef } from 'react'
import { useCluster }    from './hooks/useCluster'
import { useControls }   from './hooks/useControls'
import { useAnimations } from './hooks/useAnimations'
import { ClusterCanvas } from './components/ClusterCanvas'
import { EventLog }      from './components/EventLog'
import { SubmitBar }     from './components/SubmitBar'
import { PhaseBanner }   from './components/PhaseBanner'
import { LeftDocs }      from './components/docs/LeftDocs'

export default function App() {
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
  const { nodes, events, connected, animEvent } = useCluster(wsUrl)
  const { kill, revive, submit, addNode, removeNode, getTiming, setTiming } = useControls()
  const animations   = useAnimations(animEvent, nodes)
  const resetZoomRef = useRef<(() => void) | null>(null)

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleNodeClick = (id: number, alive: boolean) => {
    alive ? kill(id) : revive(id)
  }

  const leader = nodes.find(n => n.role === 'LEADER' && n.alive)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 24px', height: 60, flexShrink: 0,
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px var(--accent-shadow)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4"  width="14" height="3.2" rx="1" fill="white" opacity="0.95"/>
              <rect x="3" y="8.5" width="14" height="3.2" rx="1" fill="white" opacity="0.7"/>
              <rect x="3" y="13" width="14" height="3.2" rx="1" fill="white" opacity="0.5"/>
              <circle cx="5.5" cy="5.6" r="0.7" fill="var(--accent)"/>
              <circle cx="5.5" cy="10.1" r="0.7" fill="var(--accent)"/>
              <circle cx="5.5" cy="14.6" r="0.7" fill="var(--accent)"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontSize: 16, fontWeight: 800, color: 'var(--text)',
              letterSpacing: '-0.4px', lineHeight: 1,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}>
              Raft<span style={{ color: 'var(--accent)' }}>Viz</span>
            </span>
            <span style={{
              fontSize: 10, color: 'var(--text3)',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              consensus playground
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Reset */}
        <button
          onClick={() => resetZoomRef.current?.()}
          className="btn"
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text3)', padding: '7px 13px', borderRadius: 8,
            fontSize: 12, cursor: 'pointer',
            fontFamily: 'ui-monospace, monospace',
          }}
          title="reset zoom — or double-click canvas"
        >
          ⌖ reset view
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          className="btn"
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text2)', padding: '7px 11px', borderRadius: 8,
            fontSize: 14, cursor: 'pointer', lineHeight: 1,
          }}
          title="toggle light/dark theme"
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 20,
          background: connected ? 'var(--conn-bg)' : 'var(--disc-bg)',
          border: `1px solid ${connected ? 'var(--conn-border)' : 'var(--disc-border)'}`,
        }}>
          <span
            className={connected ? 'status-live' : undefined}
            style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: connected ? 'var(--accent)' : 'var(--red)',
              boxShadow: connected ? `0 0 6px var(--accent)` : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 11, color: connected ? 'var(--conn-text)' : 'var(--disc-text)',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {connected ? 'connected' : 'reconnecting…'}
          </span>
        </div>
      </header>

      {/* ══ Body ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left docs sidebar */}
        <LeftDocs nodes={nodes} />

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ClusterCanvas
            nodes={nodes}
            onNodeClick={handleNodeClick}
            onNodeRemove={removeNode}
            messages={animations.messages}
            newLogEntries={animations.newLogEntries}
            committedEntries={animations.committedEntries}
            nodeFlashes={animations.nodeFlashes}
            resetZoomRef={resetZoomRef}
          />

          {/* Phase banner */}
          <PhaseBanner nodes={nodes} />

          {/* Floating hint */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px', borderRadius: 20,
            background: 'var(--surface)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border)',
            fontSize: 10, color: 'var(--text3)',
            pointerEvents: 'none', whiteSpace: 'nowrap',
            fontFamily: 'ui-monospace, monospace',
          }}>
            hover node to kill/revive · drag to move · scroll to zoom · dbl-click reset
          </div>
        </div>

        {/* Sidebar */}
        <EventLog
          events={events}
          nodes={nodes}
          onKill={kill}
          onRevive={revive}
          onAdd={addNode}
          onSubmit={submit}
          getTiming={getTiming}
          setTiming={setTiming}
        />
      </div>

      {/* ══ Submit bar ══════════════════════════════════════════════════════ */}
      <SubmitBar leader={leader} onSubmit={submit} />
    </div>
  )
}
