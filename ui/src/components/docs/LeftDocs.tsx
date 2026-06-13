import { useState, useRef } from 'react'
import type { NodeSnapshot } from '../../types'
import {
  ElectionAnim, ReplicationAnim, HeartbeatAnim,
  QuorumAnim, TermAnim,
} from './RaftAnimations'

interface Props { nodes: NodeSnapshot[] }

type SectionId = 'overview' | 'roles' | 'election' | 'replication' | 'heartbeat' | 'quorum' | 'terms' | 'safety'

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Overview',         icon: '◈' },
  { id: 'roles',       label: 'Roles',            icon: '◉' },
  { id: 'election',    label: 'Leader Election',  icon: '⚡' },
  { id: 'replication', label: 'Log Replication',  icon: '▸' },
  { id: 'heartbeat',   label: 'Heartbeats',       icon: '♡' },
  { id: 'quorum',      label: 'Quorum',           icon: '✓' },
  { id: 'terms',       label: 'Terms',            icon: '⌚' },
  { id: 'safety',      label: 'Safety',           icon: '⛨' },
]

export function LeftDocs({ nodes }: Props) {
  const [open, setOpen] = useState(true)
  const [section, setSection] = useState<SectionId>('overview')
  const scrollRef = useRef<HTMLDivElement>(null)

  const select = (id: SectionId) => {
    setSection(id)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!open) {
    return (
      <aside style={{
        width: 44, minWidth: 44, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 12,
      }}>
        <button
          onClick={() => setOpen(true)}
          className="btn"
          title="open Raft docs"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <BookIcon />
        </button>
        <div style={{
          marginTop: 12, transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          whiteSpace: 'nowrap',
          fontSize: 10, color: 'var(--text3)',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          learn raft
        </div>
      </aside>
    )
  }

  return (
    <aside style={{
      width: 340, minWidth: 340, flexShrink: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <BookIcon />
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text)',
            letterSpacing: '-0.2px',
          }}>
            Learn Raft
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="btn"
          title="hide docs"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text3)', cursor: 'pointer',
            padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 3 L4 7 L10 11" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>

      {/* Section nav */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
        flexShrink: 0,
      }}>
        {SECTIONS.map(s => {
          const active = s.id === section
          return (
            <button
              key={s.id}
              onClick={() => select(s.id)}
              className="btn"
              style={{
                padding: '8px 10px',
                background: active ? 'var(--surface2)' : 'var(--surface)',
                border: 'none',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--text)' : 'var(--text2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 11.5, fontWeight: active ? 700 : 500,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontSize: 12, width: 14, textAlign: 'center',
                color: active ? 'var(--accent)' : 'var(--text3)',
              }}>
                {s.icon}
              </span>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        {section === 'overview'    && <Overview nodes={nodes} />}
        {section === 'roles'       && <Roles />}
        {section === 'election'    && <Election />}
        {section === 'replication' && <Replication />}
        {section === 'heartbeat'   && <Heartbeat />}
        {section === 'quorum'      && <Quorum nodes={nodes} />}
        {section === 'terms'       && <Terms />}
        {section === 'safety'      && <Safety />}
      </div>
    </aside>
  )
}

/* ── Section content ────────────────────────────────────────────────────── */

function Overview({ nodes }: { nodes: NodeSnapshot[] }) {
  const n = nodes.length || 3
  const quorum    = Math.floor(n / 2) + 1
  const tolerance = Math.floor((n - 1) / 2)
  return (
    <Section title="What is Raft?">
      <P>
        Raft is a <Em>consensus algorithm</Em>. It keeps a cluster of servers
        agreeing on the same ordered log, even when some servers fail or
        the network is unreliable.
      </P>
      <P>
        One server is the <Em>leader</Em>. Clients send all writes to it.
        It appends each command to its log and replicates it to the other
        servers (<Em>followers</Em>). Once a majority store the entry,
        it is <Em>committed</Em> and safe to apply.
      </P>
      <Demo>
        <ReplicationAnim />
      </Demo>
      <P>
        If the leader fails, a follower whose election timer expires becomes a
        <Em> candidate</Em>, asks the others for votes, and — if it wins a
        majority — becomes the new leader.
      </P>
      <Callout color="var(--accent2)">
        Your cluster has <Em>{n} nodes</Em>.
        Quorum is <Em>{quorum}</Em>.
        It tolerates <Em>{tolerance} failure{tolerance !== 1 ? 's' : ''}</Em>.
      </Callout>
    </Section>
  )
}

function Roles() {
  return (
    <Section title="The Three Roles">
      <P>
        At any moment, every server is in one of three states. Only the
        leader handles writes. Candidates exist briefly during elections.
      </P>

      <RoleCard
        color="#3B82F6" name="Leader"
        desc="Handles all client writes. Sends heartbeats to keep followers from starting elections. Replicates log entries to all followers."
      />
      <RoleCard
        color="#F59E0B" name="Candidate"
        desc="A follower whose election timer expired. It increments the term, votes for itself, and asks every peer for a vote. Wins on majority."
      />
      <RoleCard
        color="#64748B" name="Follower"
        desc="The passive default. It accepts entries from the leader, grants votes (at most once per term), and resets its timer on every heartbeat."
      />

      <Callout color="var(--text3)">
        A node also has a fourth implicit state: <Em>offline</Em> — crashed
        or partitioned. The cluster keeps working as long as a majority
        remain online.
      </Callout>
    </Section>
  )
}

function Election() {
  return (
    <Section title="Leader Election">
      <Demo>
        <ElectionAnim />
      </Demo>

      <P>
        Every follower has a randomized <Em>election timeout</Em>
        (e.g. 1.5–3.0 seconds). The timer resets each time the leader's
        heartbeat arrives.
      </P>
      <P>
        If the timer fires before a heartbeat:
      </P>

      <Steps>
        <Step n={1}>Follower increments its <Em>term</Em> and becomes a candidate.</Step>
        <Step n={2}>Votes for itself.</Step>
        <Step n={3}>Sends <Code>RequestVote</Code> RPCs to every peer.</Step>
        <Step n={4}>Each peer grants its vote if it has not voted this term.</Step>
        <Step n={5}>Once the candidate gets a <Em>majority</Em>, it becomes leader.</Step>
        <Step n={6}>The new leader immediately sends heartbeats to suppress further elections.</Step>
      </Steps>

      <Callout color="#F59E0B">
        The randomized timeout is the key trick. If two followers time out
        at the same instant they split the vote — but with random delays
        one will retry sooner and win cleanly.
      </Callout>
    </Section>
  )
}

function Replication() {
  return (
    <Section title="Log Replication">
      <Demo>
        <ReplicationAnim />
      </Demo>

      <P>
        Every command becomes a log entry. The leader's log is the
        source of truth. Followers' logs are reshaped to match.
      </P>

      <Steps>
        <Step n={1}>Client sends <Code>SET x=1</Code> to the leader.</Step>
        <Step n={2}>Leader appends the entry to its log (pending).</Step>
        <Step n={3}>Leader sends <Code>AppendEntries</Code> to each follower.</Step>
        <Step n={4}>Each follower writes the entry and acks.</Step>
        <Step n={5}>When a <Em>majority</Em> has acked, the entry is <Em>committed</Em>.</Step>
        <Step n={6}>Leader applies it to the state machine; tells followers to do the same.</Step>
      </Steps>

      <Callout color="var(--green)">
        Committed = durable. Even if the leader crashes immediately
        afterward, a majority already holds the entry, so the next
        leader will too.
      </Callout>
    </Section>
  )
}

function Heartbeat() {
  return (
    <Section title="Heartbeats">
      <Demo>
        <HeartbeatAnim />
      </Demo>

      <P>
        The leader sends an empty <Code>AppendEntries</Code> to every
        follower at a fixed interval (e.g. every 300 ms). This is the
        <Em> heartbeat</Em>.
      </P>
      <P>
        Heartbeats do two jobs:
      </P>

      <ul style={ulStyle}>
        <li style={liStyle}>Tell followers "I am still alive" so they reset their election timers.</li>
        <li style={liStyle}>Carry the leader's current <Em>commitIndex</Em>, so followers learn what is safe to apply.</li>
      </ul>

      <Callout color="var(--accent2)">
        Use the <Em>Timing</Em> panel on the right to slow heartbeats down.
        Bigger heartbeat interval ⇒ more chance to see what's going on,
        but slower failure detection.
      </Callout>
    </Section>
  )
}

function Quorum({ nodes }: { nodes: NodeSnapshot[] }) {
  const n         = nodes.length || 5
  const quorum    = Math.floor(n / 2) + 1
  const tolerance = Math.floor((n - 1) / 2)
  return (
    <Section title="Quorum & Fault Tolerance">
      <Demo>
        <QuorumAnim />
      </Demo>

      <P>
        Raft needs a <Em>majority</Em> agreement for two things:
        electing a leader and committing an entry. This majority
        is called <Em>quorum</Em>.
      </P>

      <Formula
        label="Quorum"
        formula="⌊N / 2⌋ + 1"
        example={`= ${quorum} of ${n}`}
        color="var(--accent)"
      />
      <Formula
        label="Tolerates"
        formula="⌊(N − 1) / 2⌋"
        example={`= ${tolerance} failure${tolerance !== 1 ? 's' : ''}`}
        color="var(--green)"
      />

      <P>
        Two majorities of the same set must always overlap by at
        least one node. That overlap is what stops two leaders from
        ever both committing different entries — a split brain.
      </P>

      <Callout color="#EF4444">
        With 1 node, quorum = 1 and you tolerate 0 failures.
        With 2 nodes, quorum = 2 and you still tolerate 0.
        Odd cluster sizes (3, 5, 7) give the best ratio.
      </Callout>
    </Section>
  )
}

function Terms() {
  return (
    <Section title="Terms — the Logical Clock">
      <Demo>
        <TermAnim />
      </Demo>

      <P>
        Time in Raft is divided into <Em>terms</Em>, numbered consecutively.
        Each term begins with an election. There is at most one leader
        per term.
      </P>

      <Steps>
        <Step n={1}>When a candidate starts an election, it <Em>increments</Em> the term.</Step>
        <Step n={2}>Every RPC carries the sender's term.</Step>
        <Step n={3}>If a node sees a higher term, it immediately steps down to follower.</Step>
        <Step n={4}>If a node sees a lower term, it rejects the RPC.</Step>
      </Steps>

      <Callout color="var(--accent2)">
        Higher term always wins. This single rule resolves most edge
        cases — a stale leader returning from a partition learns
        instantly that it has been deposed.
      </Callout>
    </Section>
  )
}

function Safety() {
  return (
    <Section title="Safety Properties">
      <P>
        Raft guarantees five safety properties. Together they ensure that
        all committed entries are durable and that no two leaders ever
        disagree on the log.
      </P>

      <Property
        name="Election Safety"
        desc="At most one leader per term."
      />
      <Property
        name="Leader Append-Only"
        desc="A leader never overwrites or deletes its own log entries."
      />
      <Property
        name="Log Matching"
        desc="If two logs share an entry with the same index and term, all earlier entries are identical."
      />
      <Property
        name="Leader Completeness"
        desc="An entry committed in some term is present in every leader's log thereafter."
      />
      <Property
        name="State Machine Safety"
        desc="If a node applies an entry at index i, no other node ever applies a different entry at index i."
      />

      <Callout color="var(--purple)">
        Together these mean: once an entry is committed, every
        future leader will have it, and every node will eventually
        apply it. No rollback, no divergence.
      </Callout>
    </Section>
  )
}

/* ── Building blocks ────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontSize: 17, fontWeight: 800, color: 'var(--text)',
        marginBottom: 12, letterSpacing: '-0.3px',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 13.5, color: 'var(--text2)',
      lineHeight: 1.65,
    }}>
      {children}
    </p>
  )
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</span>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      background: 'var(--surface2)', padding: '1px 6px',
      borderRadius: 4, fontSize: 12,
      color: 'var(--accent2)',
      fontFamily: 'ui-monospace, monospace',
      border: '1px solid var(--border)',
    }}>
      {children}
    </code>
  )
}

function Demo({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 8,
    }}>
      {children}
    </div>
  )
}

function Callout({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 8,
      background: `${color}10`,
      border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
      fontSize: 12.5, color: 'var(--text2)',
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

function RoleCard({ color, name, desc }: { color: string; name: string; desc: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 8,
      background: 'var(--surface)',
      borderLeft: `4px solid ${color}`,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: color, boxShadow: `0 0 6px ${color}99`,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 700, color,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}>
          {name}
        </span>
      </div>
      <p style={{
        fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6,
      }}>
        {desc}
      </p>
    </div>
  )
}

function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </ol>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        flexShrink: 0,
        width: 22, height: 22, borderRadius: '50%',
        background: 'var(--accent)',
        color: 'white', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {n}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.55, paddingTop: 2 }}>
        {children}
      </span>
    </li>
  )
}

function Formula({ label, formula, example, color }: {
  label: string; formula: string; example: string; color: string
}) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
    }}>
      <div>
        <div style={{
          fontSize: 10.5, color: 'var(--text3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, color,
          fontFamily: 'ui-monospace, monospace',
        }}>
          {formula}
        </div>
      </div>
      <div style={{
        fontSize: 12, color: 'var(--text3)',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {example}
      </div>
    </div>
  )
}

function Property({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{
        fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
        marginBottom: 4,
      }}>
        {name}
      </div>
      <div style={{
        fontSize: 12, color: 'var(--text3)', lineHeight: 1.55,
      }}>
        {desc}
      </div>
    </div>
  )
}

const ulStyle: React.CSSProperties = {
  paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6,
  listStyle: 'disc', color: 'var(--accent)',
}
const liStyle: React.CSSProperties = {
  fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6,
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3 L8 4.2 L13 3 L13 12 L8 13.2 L3 12 Z"
        stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <line x1="8" y1="4.2" x2="8" y2="13.2"
        stroke="var(--accent)" strokeWidth="1.4"/>
    </svg>
  )
}
