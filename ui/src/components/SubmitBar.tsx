import { useState } from 'react'
import type { NodeSnapshot } from '../types'

interface Props {
  leader:   NodeSnapshot | undefined
  onSubmit: (cmd: string) => void
}

export function SubmitBar({ leader, onSubmit }: Props) {
  const [cmd, setCmd]         = useState('')
  const [focused, setFocused] = useState(false)

  const handle = () => {
    const c = cmd.trim()
    if (c) { onSubmit(c); setCmd('') }
  }

  const ready = !!leader && !!cmd.trim()

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--header-bg)',
      backdropFilter: 'blur(10px)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 24px',
      }}>
        {/* Leader badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 8,
          background: leader ? 'var(--btn-primary-bg)' : 'var(--surface2)',
          border: `1px solid ${leader ? 'var(--btn-primary-border)' : 'var(--border)'}`,
          fontSize: 12, flexShrink: 0,
          fontFamily: 'ui-monospace, monospace',
        }}>
          {leader && (
            <span
              className="status-live"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent2)',
                boxShadow: '0 0 4px var(--accent2)',
              }}
            />
          )}
          <span style={{ color: 'var(--text3)' }}>send to</span>
          <span style={{
            color: leader ? 'var(--btn-primary-text)' : 'var(--text3)',
            fontWeight: leader ? 700 : 400,
          }}>
            {leader ? `N${leader.id}` : '—'}
          </span>
        </div>

        {/* Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            onFocus={() => setFocused(true)}
            onBlur={()  => setFocused(false)}
            placeholder={
              leader
                ? 'SET x 1  ·  GET x  ·  DEL y  …  (Enter to send)'
                : 'no leader — cluster unavailable'
            }
            disabled={!leader}
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              color: 'var(--text)',
              padding: '11px 16px',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: focused ? `0 0 0 3px ${'var(--accent-shadow)'}` : 'none',
              cursor: leader ? 'text' : 'not-allowed',
              opacity: leader ? 1 : 0.5,
              fontFamily: 'ui-monospace, monospace',
            }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handle}
          disabled={!ready}
          className="btn"
          style={{
            background: ready
              ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
              : 'var(--surface2)',
            border: `1px solid ${ready ? 'var(--accent)' : 'var(--border)'}`,
            color: ready ? '#FFFFFF' : 'var(--text3)',
            padding: '11px 22px', borderRadius: 8,
            fontSize: 13, fontWeight: 700,
            cursor: ready ? 'pointer' : 'not-allowed',
            fontFamily: 'ui-monospace, monospace',
            flexShrink: 0,
            boxShadow: ready ? '0 2px 8px var(--accent-shadow)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          submit ↵
        </button>
      </div>
    </footer>
  )
}
