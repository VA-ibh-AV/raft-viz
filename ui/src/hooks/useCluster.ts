import { useState, useEffect } from 'react'
import type { NodeSnapshot, RaftEvent } from '../types'

interface ClusterState {
  nodes:      NodeSnapshot[]
  events:     RaftEvent[]
  connected:  boolean
  animEvent:  RaftEvent | null
}

export function useCluster(url: string): ClusterState {
  const [nodes,     setNodes]     = useState<NodeSnapshot[]>([])
  const [events,    setEvents]    = useState<RaftEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [animEvent, setAnimEvent] = useState<RaftEvent | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null
    let dead = false

    const connect = () => {
      ws = new WebSocket(url)
      ws.onopen  = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        if (!dead) setTimeout(connect, 2000)
      }
      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)
        if (msg.nodes) setNodes(msg.nodes)
        if (msg.event) {
          const e: RaftEvent = { ...msg.event, timestamp: Date.now() }
          setAnimEvent(e)
          if (e.type !== 'heartbeat') {
            setEvents(prev => [e, ...prev].slice(0, 40))
          }
        }
      }
    }

    connect()
    return () => { dead = true; ws?.close() }
  }, [url])

  return { nodes, events, connected, animEvent }
}
