import type { RaftEvent, NodeSnapshot } from '../types'

export interface Narration {
  text:     string
  hint:     string
  category: 'election' | 'replication' | 'membership' | 'failure' | 'info'
}

export function narrate(e: RaftEvent, nodes: NodeSnapshot[]): Narration {
  const total  = Math.max(nodes.length, 1)
  const quorum = Math.floor(total / 2) + 1

  switch (e.type) {
    case 'role_changed':
      if (e.role === 'LEADER') {
        const term = nodes.find(n => n.id === e.nodeId)?.term
        return {
          text:     `N${e.nodeId} won the election and is now the leader${term != null ? ` (term ${term})` : ''}.`,
          hint:     `Reached quorum of ${quorum}/${total} votes — can now replicate writes.`,
          category: 'election',
        }
      }
      if (e.role === 'CANDIDATE') {
        return {
          text:     `N${e.nodeId} timed out — starting an election.`,
          hint:     `No heartbeat received; promoting itself to candidate and asking peers for votes.`,
          category: 'election',
        }
      }
      return {
        text:     `N${e.nodeId} stepped down to follower.`,
        hint:     `Saw a higher term — yielding leadership.`,
        category: 'election',
      }

    case 'vote_granted':
      return {
        text:     `N${e.nodeId} voted for N${e.votedFor}.`,
        hint:     `Each node may vote at most once per term.`,
        category: 'election',
      }

    case 'log_appended':
      return {
        text:     `Replicated [${e.logIndex}] "${e.command}" → N${e.nodeId}.`,
        hint:     `Leader sent AppendEntries; entry is pending until quorum stores it.`,
        category: 'replication',
      }

    case 'log_committed':
      return {
        text:     `N${e.nodeId} committed up to index ${e.commitIndex}.`,
        hint:     `Quorum has acknowledged — the entry is now durable.`,
        category: 'replication',
      }

    case 'node_killed':
      return {
        text:     `N${e.nodeId} crashed.`,
        hint:     `Cluster keeps working as long as ${quorum}/${total} remain alive.`,
        category: 'failure',
      }

    case 'node_revived':
      return {
        text:     `N${e.nodeId} came back online.`,
        hint:     `Will catch up by replaying the leader's log.`,
        category: 'failure',
      }

    case 'node_added':
      return {
        text:     `N${e.nodeId} joined the cluster.`,
        hint:     `Membership grew to ${total} nodes — new quorum is ${quorum}.`,
        category: 'membership',
      }

    case 'node_removed':
      return {
        text:     `N${e.nodeId} was removed from the cluster.`,
        hint:     `Membership shrunk — quorum recalculated.`,
        category: 'membership',
      }

    default:
      return { text: `N${e.nodeId} ${e.type}`, hint: '', category: 'info' }
  }
}

export const CATEGORY_COLOR: Record<Narration['category'], string> = {
  election:    '#F59E0B',
  replication: '#3B82F6',
  membership:  '#8B5CF6',
  failure:     '#EF4444',
  info:        '#64748B',
}

export const CATEGORY_LABEL: Record<Narration['category'], string> = {
  election:    'election',
  replication: 'replication',
  membership:  'membership',
  failure:     'failure',
  info:        'info',
}

/* ── Cluster phase ──────────────────────────────────────────────────────── */

export type Phase =
  | { kind: 'stable',    leader: NodeSnapshot }
  | { kind: 'election',  candidates: NodeSnapshot[] }
  | { kind: 'no_quorum', alive: number; needed: number }
  | { kind: 'no_leader' }
  | { kind: 'empty' }

export function clusterPhase(nodes: NodeSnapshot[]): Phase {
  if (!nodes.length) return { kind: 'empty' }
  const alive      = nodes.filter(n => n.alive)
  const needed     = Math.floor(nodes.length / 2) + 1
  const candidates = alive.filter(n => n.role === 'CANDIDATE')
  const leader     = alive.find(n => n.role === 'LEADER')

  if (alive.length < needed)  return { kind: 'no_quorum', alive: alive.length, needed }
  if (candidates.length > 0)  return { kind: 'election', candidates }
  if (leader)                 return { kind: 'stable', leader }
  return { kind: 'no_leader' }
}
