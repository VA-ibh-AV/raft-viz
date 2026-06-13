import { useState, useEffect } from 'react'
import type { Timing } from '../hooks/useControls'

interface Props {
  getTiming: () => Promise<Timing>
  setTiming: (t: Timing) => Promise<Timing>
}

export function TimingControls({ getTiming, setTiming }: Props) {
  const [t, setT]       = useState<Timing | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getTiming().then(setT).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) {
    return (
      <div style={{
        padding: '12px 16px', fontSize: 11, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace',
      }}>
        loading timing…
      </div>
    )
  }

  const update = async (patch: Partial<Timing>) => {
    const next = { ...t, ...patch }
    if (next.electionMaxMs < next.electionMinMs) next.electionMaxMs = next.electionMinMs
    setT(next)
    setBusy(true)
    try { await setTiming(next) } finally { setBusy(false) }
  }

  const preset = (hb: number, eMin: number, eMax: number) =>
    update({ heartbeatMs: hb, electionMinMs: eMin, electionMaxMs: eMax })

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      <Slider
        label="Heartbeat interval"
        hint="Leader pings followers this often. Smaller = more chatter, faster failure detection."
        value={t.heartbeatMs}
        min={50} max={2000} step={50}
        suffix="ms"
        onChange={v => update({ heartbeatMs: v })}
      />

      <DualSlider
        label="Election timeout"
        hint="Follower waits this long without a heartbeat before starting an election. Randomized between min and max."
        valueMin={t.electionMinMs}
        valueMax={t.electionMaxMs}
        min={200} max={8000} step={100}
        onChangeMin={v => update({ electionMinMs: v })}
        onChangeMax={v => update({ electionMaxMs: v })}
      />

      {/* Presets */}
      <div>
        <div style={{
          fontSize: 10, color: 'var(--text3)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: 8,
        }}>
          presets
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Preset label="Watch"    sub="slow"   onClick={() => preset(600, 2500, 5000)} />
          <Preset label="Learn"    sub="medium" onClick={() => preset(300, 1500, 3000)} />
          <Preset label="Realtime" sub="fast"   onClick={() => preset(100,  500, 1000)} />
        </div>
      </div>

      <div style={{
        fontSize: 10, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace',
        opacity: busy ? 0.6 : 0.3,
      }}>
        {busy ? 'applying…' : 'changes apply to all nodes immediately'}
      </div>
    </div>
  )
}

/* ── Single slider ──────────────────────────────────────────────────────── */

function Slider({ label, hint, value, min, max, step, suffix, onChange }: {
  label:    string
  hint:     string
  value:    number
  min:      number
  max:      number
  step:     number
  suffix:   string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 12, color: 'var(--text2)', fontWeight: 600,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--accent)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {value}<span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 2 }}>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="range"
        style={{ width: '100%' }}
      />
      <div style={{
        fontSize: 10.5, color: 'var(--text3)',
        marginTop: 4, lineHeight: 1.5, fontStyle: 'italic',
      }}>
        {hint}
      </div>
    </div>
  )
}

/* ── Dual slider for election min/max ───────────────────────────────────── */

function DualSlider({ label, hint, valueMin, valueMax, min, max, step, onChangeMin, onChangeMax }: {
  label:       string
  hint:        string
  valueMin:    number
  valueMax:    number
  min:         number
  max:         number
  step:        number
  onChangeMin: (v: number) => void
  onChangeMax: (v: number) => void
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--amber)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {valueMin}<span style={{ color: 'var(--text3)', fontSize: 10 }}>–</span>{valueMax}
          <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 2 }}>ms</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', width: 22, fontFamily: 'ui-monospace, monospace' }}>min</span>
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMin}
          onChange={e => onChangeMin(Number(e.target.value))}
          className="range"
          style={{ flex: 1 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', width: 22, fontFamily: 'ui-monospace, monospace' }}>max</span>
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMax}
          onChange={e => onChangeMax(Number(e.target.value))}
          className="range"
          style={{ flex: 1 }}
        />
      </div>
      <div style={{
        fontSize: 10.5, color: 'var(--text3)',
        marginTop: 4, lineHeight: 1.5, fontStyle: 'italic',
      }}>
        {hint}
      </div>
    </div>
  )
}

function Preset({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        flex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 7,
        padding: '7px 8px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 1,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text)',
        fontFamily: 'ui-monospace, monospace',
      }}>{label}</span>
      <span style={{
        fontSize: 9, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>{sub}</span>
    </button>
  )
}
