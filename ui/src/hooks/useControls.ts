const BASE = 'http://localhost:8080'
const post = (path: string) => fetch(`${BASE}${path}`, { method: 'POST' })

export interface Timing {
  heartbeatMs:   number
  electionMinMs: number
  electionMaxMs: number
}

export function useControls() {
  const kill      = (id: number)  => post(`/nodes/${id}/kill`)
  const revive    = (id: number)  => post(`/nodes/${id}/revive`)
  const submit    = (cmd: string) => post(`/submit?cmd=${encodeURIComponent(cmd)}`)
  const addNode   = ()            => post('/nodes/add')
  const removeNode = (id: number) => post(`/nodes/${id}/remove`)

  const getTiming = async (): Promise<Timing> => {
    const r = await fetch(`${BASE}/config/timing`)
    return r.json()
  }
  const setTiming = async (t: Timing): Promise<Timing> => {
    const r = await fetch(`${BASE}/config/timing`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(t),
    })
    return r.json()
  }

  return { kill, revive, submit, addNode, removeNode, getTiming, setTiming }
}
