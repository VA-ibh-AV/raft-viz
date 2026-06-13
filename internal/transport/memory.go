package transport

import (
	"fmt"
	"sync"

	"raft-viz/internal/raft"
)

// MemoryTransport connects nodes in the same process via direct function calls.
// Register a node to make it reachable. Deregister to simulate it going offline.
type MemoryTransport struct {
	mu    sync.RWMutex
	nodes map[int]*raft.Node
}

func NewMemoryTransport() *MemoryTransport {
	return &MemoryTransport{
		nodes: make(map[int]*raft.Node),
	}
}

func (t *MemoryTransport) Register(id int, node *raft.Node) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.nodes[id] = node
}

// Deregister simulates the node going offline —
// any peer trying to contact it will get an error.
func (t *MemoryTransport) Deregister(id int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.nodes, id)
}

func (t *MemoryTransport) SendRequestVote(toID int, req raft.RequestVoteRequest) (raft.RequestVoteResponse, error) {
	t.mu.RLock()
	node, ok := t.nodes[toID]
	t.mu.RUnlock()
	if !ok {
		return raft.RequestVoteResponse{}, fmt.Errorf("node %d unreachable", toID)
	}
	return node.HandleRequestVote(req), nil
}

func (t *MemoryTransport) SendAppendEntries(toID int, req raft.AppendEntriesRequest) (raft.AppendEntriesResponse, error) {
	t.mu.RLock()
	node, ok := t.nodes[toID]
	t.mu.RUnlock()
	if !ok {
		return raft.AppendEntriesResponse{}, fmt.Errorf("node %d unreachable", toID)
	}
	return node.HandleAppendEntries(req), nil
}
