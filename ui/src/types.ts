export type RaftRole = 'FOLLOWER' | 'CANDIDATE' | 'LEADER' | 'DEAD'

export interface LogEntry {
  index:   number
  term:    number
  command: string
}

export interface NodeSnapshot {
  id:          number
  role:        RaftRole
  term:        number
  leaderId:    number
  alive:       boolean
  log:         LogEntry[]   
  commitIndex: number       
}

export interface RaftEvent {
  type:         string
  nodeId:       number
  role?:        string
  votedFor?:    number
  command?:     string      
  logIndex?:    number      
  commitIndex?: number      
  timestamp:    number
}