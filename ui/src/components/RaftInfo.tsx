import { useState } from 'react'
import type { NodeSnapshot } from '../types'

const ROLE_COL: Record<string, string> = {
  LEADER:    '#3B82F6',
  CANDIDATE: '#F59E0B',
  FOLLOWER:  '#64748B',
}

interface Props { nodes: NodeSnapshot[]; icon?: React.ReactNode }

export function RaftInfo({ nodes, icon }: Props) {
  const [open, setOpen] = useState(false)

  const n         = nodes.length || 3
  const quorum    = Math.floor(n / 2) + 1
  const tolerance = Math.floor((n - 1) / 2)

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>

      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: open ? 'var(--surface2)' : 'var(--surface)',
          border: 'none', borderBottom: open ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon ?? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3 L7 4 L12 3 L12 11 L7 12 L2 11 Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
              <line x1="7" y1="4" x2="7" y2="12" stroke="var(--accent)" strokeWidth="1.4"/>
            </svg>
          )}
          <span style={{
            fontSize: 12, color: 'var(--text2)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
          }}>
            raft basics
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M3 4.5 L6 7.5 L9 4.5" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        </svg>
      </button>

      {open && (
        <div style={{
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 14,
          maxHeight: 480, overflowY: 'auto',
        }}>

          {/* What is Raft */}
          <Section title="What is Raft">
            <p style={prose}>
              Raft is a <Em>consensus algorithm</Em> — it keeps a cluster of servers
              agreeing on a single shared log, even when some servers fail.
              One server becomes leader and drives all writes; the others replicate.
            </p>
          </Section>

          {/* Current cluster stats */}
          <Section title={`Current Cluster — ${n} node${n !== 1 ? 's' : ''}`}>
            <StatRow
              label="Quorum needed"
              value={`${quorum} / ${n} nodes`}
              note={`⌊${n}/2⌋ + 1`}
              color="var(--accent)"
            />
            <StatRow
              label="Fault tolerance"
              value={`${tolerance} failure${tolerance !== 1 ? 's' : ''}`}
              note={`⌊(${n}−1)/2⌋`}
              color={tolerance === 0 ? 'var(--red)' : 'var(--green)'}
            />
            {tolerance === 0 && (
              <p style={{ ...prose, color: 'var(--red)', marginTop: 4 }}>
                ⚠ 1-node cluster has no fault tolerance — any failure loses quorum.
              </p>
            )}
          </Section>

          {/* Roles */}
          <Section title="Roles">
            {[
              { role: 'LEADER',    desc: 'Handles all writes, sends heartbeats to followers' },
              { role: 'CANDIDATE', desc: 'Running an election — requesting votes from peers' },
              { role: 'FOLLOWER',  desc: 'Replicates leader log, votes in elections' },
            ].map(({ role, desc }) => (
              <div key={role} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{
                  marginTop: 2, width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: ROLE_COL[role], display: 'inline-block',
                  boxShadow: role === 'LEADER' ? `0 0 6px ${ROLE_COL[role]}88` : 'none',
                }} />
                <div>
                  <span style={{ fontSize: 11, color: ROLE_COL[role],
                    fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                    {role.toLowerCase()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)',
                    fontFamily: 'ui-monospace, monospace' }}> — {desc}</span>
                </div>
              </div>
            ))}
          </Section>

          {/* Key concepts */}
          <Section title="Key Concepts">
            {[
              { name: 'Term',    def: 'Logical clock that increments on every election. Higher term wins.' },
              { name: 'Quorum',  def: `Majority of nodes (⌊N/2⌋+1). Required for elections and commits.` },
              { name: 'Log',     def: 'Ordered list of commands replicated to all live nodes.' },
              { name: 'Commit',  def: 'Entry is safe once a quorum of nodes have written it to their log.' },
              { name: 'Election',def: 'Follower times out without heartbeat → becomes candidate → requests votes.' },
            ].map(({ name, def }) => (
              <div key={name} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace' }}>{name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)',
                  fontFamily: 'ui-monospace, monospace' }}> — {def}</span>
              </div>
            ))}
          </Section>

          {/* Events guide */}
          <Section title="Events Guide">
            {[
              { icon: '◈', label: 'role changed', desc: 'Node transitioned role (e.g. follower → leader)' },
              { icon: '✓', label: 'vote granted', desc: 'Node cast its vote for a candidate' },
              { icon: '▸', label: 'log appended', desc: 'Leader replicated an entry to this node' },
              { icon: '✦', label: 'log committed', desc: 'Entry reached quorum — now durable' },
              { icon: '⏻', label: 'node killed',   desc: 'Node crashed / taken offline' },
              { icon: '↺', label: 'node revived',  desc: 'Node came back online and rejoined cluster' },
              { icon: '⊕', label: 'node added',    desc: 'New node joined the cluster' },
              { icon: '⊖', label: 'node removed',  desc: 'Node gracefully left the cluster' },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', width: 13, flexShrink: 0,
                  textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>{icon}</span>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)',
                    fontFamily: 'ui-monospace, monospace' }}> — {desc}</span>
                </div>
              </div>
            ))}
          </Section>

        </div>
      )}
    </div>
  )
}

/* ── Small helpers ──────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: 'var(--text3)', letterSpacing: '0.14em',
        textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace',
        marginBottom: 6, paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function StatRow({ label, value, note, color }: {
  label: string; value: string; note: string; color: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color,
          fontFamily: 'ui-monospace, monospace' }}>{value}</span>
        <span style={{ fontSize: 10, color: 'var(--text3)',
          fontFamily: 'ui-monospace, monospace' }}>({note})</span>
      </div>
    </div>
  )
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{children}</span>
  )
}

const prose: React.CSSProperties = {
  fontSize: 11, color: 'var(--text3)',
  fontFamily: 'ui-monospace, monospace',
  lineHeight: 1.7,
}
