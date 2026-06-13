const BASE = 'http://localhost:8080'
const post = (path: string) => fetch(`${BASE}${path}`, { method: 'POST' })

export function useControls() {
  const kill      = (id: number)  => post(`/nodes/${id}/kill`)
  const revive    = (id: number)  => post(`/nodes/${id}/revive`)
  const submit    = (cmd: string) => post(`/submit?cmd=${encodeURIComponent(cmd)}`)
  const addNode   = ()            => post('/nodes/add')
  const removeNode = (id: number) => post(`/nodes/${id}/remove`)
  return { kill, revive, submit, addNode, removeNode }
}