import { useState, useEffect, useRef } from 'react'
import type {
  RaftEvent, NodeSnapshot,
  TravelingMessage, NewLogEntry,
  CommittedEntry, NodeFlash,
} from '../types'

export interface AnimationState {
  messages:         TravelingMessage[]
  newLogEntries:    NewLogEntry[]
  committedEntries: CommittedEntry[]
  nodeFlashes:      NodeFlash[]
}

export function useAnimations(animEvent: RaftEvent | null, nodes: NodeSnapshot[]): AnimationState {
  const [messages,         setMsgs]      = useState<TravelingMessage[]>([])
  const [newLogEntries,    setNewLogs]   = useState<NewLogEntry[]>([])
  const [committedEntries, setCommitted] = useState<CommittedEntry[]>([])
  const [nodeFlashes,      setFlashes]   = useState<NodeFlash[]>([])

  const nodesRef         = useRef(nodes)
  const lastHeartbeatRef = useRef<Record<string, number>>({})
  nodesRef.current = nodes

  useEffect(() => {
    if (!animEvent) return
    const e      = animEvent
    const now    = performance.now()
    const ts     = Date.now()
    const leader = nodesRef.current.find(n => n.role === 'LEADER' && n.alive)

    if (e.type === 'vote_granted' && e.votedFor != null) {
      const msg: TravelingMessage = {
        id:        `vote-${e.nodeId}-${e.votedFor}-${ts}`,
        fromNode:  e.nodeId,
        toNode:    e.votedFor,
        kind:      'vote',
        startedAt: now,
        duration:  600,
      }
      setMsgs(p => [...p, msg])
      setTimeout(() => setMsgs(p => p.filter(m => m.id !== msg.id)), 650)
    }

    if (e.type === 'log_appended' && e.logIndex != null) {
      const receiver = nodesRef.current.find(n => n.id === e.nodeId)
      if (leader && leader.id !== e.nodeId && receiver?.alive) {
        const msg: TravelingMessage = {
          id:        `append-${e.nodeId}-${e.logIndex}-${ts}`,
          fromNode:  leader.id,
          toNode:    e.nodeId,
          kind:      'append',
          startedAt: now,
          duration:  700,
        }
        setMsgs(p => [...p, msg])
        setTimeout(() => setMsgs(p => p.filter(m => m.id !== msg.id)), 750)
      }
      const entry: NewLogEntry = { nodeId: e.nodeId, logIndex: e.logIndex, addedAt: ts }
      setNewLogs(p => [...p, entry])
      setTimeout(() => setNewLogs(p =>
        p.filter(x => !(x.nodeId === e.nodeId && x.logIndex === e.logIndex))
      ), 350)
    }

    if (e.type === 'log_committed' && e.commitIndex != null) {
      const c: CommittedEntry = { nodeId: e.nodeId, commitIndex: e.commitIndex, flashedAt: ts }
      setCommitted(p => [...p, c])
      setTimeout(() => setCommitted(p =>
        p.filter(x => !(x.nodeId === e.nodeId && x.commitIndex === e.commitIndex))
      ), 800)
    }

    if (e.type === 'node_killed') {
      const f: NodeFlash = { nodeId: e.nodeId, kind: 'killed', firedAt: ts }
      setFlashes(p => [...p, f])
      setTimeout(() => setFlashes(p => p.filter(x => x.firedAt !== f.firedAt)), 500)
    }

    if (e.type === 'node_revived') {
      const f: NodeFlash = { nodeId: e.nodeId, kind: 'revived', firedAt: ts }
      setFlashes(p => [...p, f])
      setTimeout(() => setFlashes(p => p.filter(x => x.firedAt !== f.firedAt)), 550)
    }

    if (e.type === 'role_changed' && e.role === 'LEADER') {
      const f: NodeFlash = { nodeId: e.nodeId, kind: 'leader', firedAt: ts }
      setFlashes(p => [...p, f])
      setTimeout(() => setFlashes(p => p.filter(x => x.firedAt !== f.firedAt)), 650)
    }

    if (e.type === 'heartbeat' && e.from != null && e.from !== e.nodeId) {
      const receiver = nodesRef.current.find(n => n.id === e.nodeId)
      const sender   = nodesRef.current.find(n => n.id === e.from)
      if (receiver?.alive && sender?.alive) {
        const key     = `${e.from}-${e.nodeId}`
        const elapsed = now - (lastHeartbeatRef.current[key] ?? 0)
        if (elapsed > 400) {
          lastHeartbeatRef.current[key] = now
          const msg: TravelingMessage = {
            id:        `hb-${e.from}-${e.nodeId}-${ts}`,
            fromNode:  e.from,
            toNode:    e.nodeId,
            kind:      'heartbeat',
            startedAt: now,
            duration:  600,
          }
          setMsgs(p => [...p, msg])
          setTimeout(() => setMsgs(p => p.filter(m => m.id !== msg.id)), 650)
        }
      }
    }
  }, [animEvent])

  return { messages, newLogEntries, committedEntries, nodeFlashes }
}
