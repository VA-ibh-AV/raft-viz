package raft

type Role int

const (
	Follower Role = iota
	Candidate
	Leader
)

func (r Role) String() string {
	switch r {
	case Follower:
		return "FOLLOWER"
	case Candidate:
		return "CANDIDATE"
	case Leader:
		return "LEADER"
	default:
		return "UNKNOWN"
	}
}

// ── Log ───────────────────────────────────────────────────────────────────────

type LogEntry struct {
	Index   int    `json:"index"`
	Term    int    `json:"term"`
	Command string `json:"command"`
}

// ── RPC types ─────────────────────────────────────────────────────────────────

type RequestVoteRequest struct {
	Term         int
	CandidateID  int
	LastLogIndex int // highest log index the candidate has
	LastLogTerm  int // term of that entry
}

type RequestVoteResponse struct {
	Term        int
	VoteGranted bool
}

type AppendEntriesRequest struct {
	Term         int
	LeaderID     int
	PrevLogIndex int        // index of the entry immediately before new ones
	PrevLogTerm  int        // term of that entry
	Entries      []LogEntry // empty = heartbeat only
	LeaderCommit int        // leader's current commitIndex
}

type AppendEntriesResponse struct {
	Term    int
	Success bool
}

// ── Events ────────────────────────────────────────────────────────────────────

type EventType string

const (
	EventRoleChanged  EventType = "role_changed"
	EventVoteGranted  EventType = "vote_granted"
	EventHeartbeat    EventType = "heartbeat"
	EventNodeKilled   EventType = "node_killed"
	EventNodeRevived  EventType = "node_revived"
	EventLogAppended  EventType = "log_appended"
	EventLogCommitted EventType = "log_committed"
	EventNodeAdded    EventType = "node_added"
	EventNodeRemoved  EventType = "node_removed"
)

type Event struct {
	NodeID int
	Type   EventType
	Data   any
}
