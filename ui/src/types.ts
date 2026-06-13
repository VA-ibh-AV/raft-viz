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
  from?:        number
  timestamp:    number
}

export interface TravelingMessage {
  id:        string
  fromNode:  number
  toNode:    number
  kind:      'vote' | 'append' | 'heartbeat'
  startedAt: number   // performance.now()
  duration:  number   // ms
}

export interface NewLogEntry {
  nodeId:   number
  logIndex: number
  addedAt:  number
}

export interface CommittedEntry {
  nodeId:      number
  commitIndex: number
  flashedAt:   number
}

export interface NodeFlash {
  nodeId:  number
  kind:    'killed' | 'revived' | 'leader'
  firedAt: number
}