package raft

// Transport is how one node reaches another.
// Phase 1: MemoryTransport (direct calls, same process).
// Phase 3: swap for HTTP transport — Node code changes nothing.
type Transport interface {
	SendRequestVote(toID int, req RequestVoteRequest) (RequestVoteResponse, error)
	SendAppendEntries(toID int, req AppendEntriesRequest) (AppendEntriesResponse, error)
}
