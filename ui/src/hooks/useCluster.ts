import { useState, useEffect } from 'react'
import type { NodeSnapshot, RaftEvent } from '../types'

interface ClusterState {
  nodes: NodeSnapshot[]
  events: RaftEvent[]
  connected: boolean
}

export function useCluster(url: string): ClusterState {
  const [nodes, setNodes] = useState<NodeSnapshot[]>([])
  const [events, setEvents] = useState<RaftEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let dead = false // set on cleanup so reconnect loop stops

    const connect = () => {
      ws = new WebSocket(url)

      ws.onopen = () => setConnected(true)

      ws.onclose = () => {
        setConnected(false)
        if (!dead) setTimeout(connect, 2000) // auto-reconnect
      }

      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)

        if (msg.nodes) setNodes(msg.nodes)

        if (msg.event) {
          setEvents(prev =>
            [{ ...msg.event, timestamp: Date.now() }, ...prev].slice(0, 40)
          )
        }
      }
    }

    connect()

    return () => {
      dead = true
      ws?.close()
    }
  }, [url])

  return { nodes, events, connected }
}