import { useState, useEffect, useRef } from 'react'
import type { RaftEvent, NodeSnapshot } from '../types'
import { narrate, CATEGORY_COLOR, CATEGORY_LABEL } from '../lib/narrate'

interface Props {
  events: RaftEvent[]
  nodes:  NodeSnapshot[]
}

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m`
}

export function Commentary({ events, nodes }: Props) {
  const prevLenRef = useRef(events.length)
  const [freshIdx, setFreshIdx] = useState(-1)
  const [, setTick] = useState(0)

  useEffect(() => {
    const added = events.length - prevLenRef.current
    prevLenRef.current = events.length
    if (added > 0) {
      setFreshIdx(added - 1)
      const t = setTimeout(() => setFreshIdx(-1), 300)
      return () => clearTimeout(t)
    }
  }, [events.length])

  useEffect(() => {
    if (!events.length) return
    const t = setInterval(() => setTick(n => n + 1), 8_000)
    return () => clearInterval(t)
  }, [events.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (events.length === 0) {
    return (
      <div style={{
        padding: '28px 16px',
        textAlign: 'center',
        color: 'var(--text3)',
        fontSize: 13,
        lineHeight: 1.7,
      }}>
        Waiting for cluster activity…<br/>
        <span style={{ opacity: 0.6, fontSize: 12 }}>
          Submit a command or trigger a scenario.
        </span>
      </div>
    )
  }

  return (
    <div>
      {events.map((e, i) => {
        const n     = narrate(e, nodes)
        const col   = CATEGORY_COLOR[n.category]
        const fresh = i <= freshIdx
        return (
          <div
            key={`${e.timestamp}-${e.nodeId}-${e.type}-${i}`}
            className={fresh ? 'event-row-enter' : undefined}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              borderLeft: `3px solid ${col}`,
              background: fresh ? 'var(--surface2)' : 'transparent',
              transition: 'background 0.4s',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <span style={{
                fontSize: 10, color: col,
                padding: '2px 8px', borderRadius: 5,
                background: `${col}18`,
                border: `1px solid ${col}33`,
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontWeight: 700,
              }}>
                {CATEGORY_LABEL[n.category]}
              </span>
              <span style={{
                fontSize: 11, color: 'var(--text3)',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {relTime(e.timestamp)}
              </span>
            </div>
            <div style={{
              fontSize: 13.5, color: 'var(--text)',
              lineHeight: 1.5,
              marginBottom: n.hint ? 6 : 0,
              fontWeight: 500,
            }}>
              {n.text}
            </div>
            {n.hint && (
              <div style={{
                fontSize: 11.5, color: 'var(--text3)',
                lineHeight: 1.55, fontStyle: 'italic',
              }}>
                {n.hint}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
