package cluster

import (
	"fmt"
	"sync"

	"raft-viz/internal/raft"
	"raft-viz/internal/transport"
)

const maxClusterSize = 7

type EntryState struct {
	ID          int
	Alive       bool
	Role        string
	Term        int
	LeaderID    int
	Log         []raft.LogEntry
	CommitIndex int
}

type entry struct {
	id    int
	node  *raft.Node
	alive bool
}

func (e *entry) state() EntryState {
	if !e.alive || e.node == nil {
		return EntryState{ID: e.id, Alive: false, Role: "DEAD"}
	}
	role, term, leaderID := e.node.State()
	log, commitIndex := e.node.LogState()
	return EntryState{
		ID: e.id, Alive: true,
		Role: role.String(), Term: term, LeaderID: leaderID,
		Log: log, CommitIndex: commitIndex,
	}
}

type Cluster struct {
	mu         sync.RWMutex
	entries    []*entry
	nextNodeID int // next ID to assign; never reuses IDs
	transport  *transport.MemoryTransport
	bus        chan<- raft.Event
}

func New(size int, tr *transport.MemoryTransport, bus chan<- raft.Event) *Cluster {
	c := &Cluster{transport: tr, bus: bus, nextNodeID: size + 1}
	for id := 1; id <= size; id++ {
		node := raft.NewNode(id, peersAmong(id, idsUpTo(size)), tr, bus)
		tr.Register(id, node)
		c.entries = append(c.entries, &entry{id: id, node: node, alive: true})
	}
	return c
}

func (c *Cluster) Start() {
	c.mu.RLock()
	defer c.mu.RUnlock()
	for _, e := range c.entries {
		if e.alive {
			e.node.Start()
		}
	}
}

// ── Chaos (crash / revive) ────────────────────────────────────────────────────

func (c *Cluster) Kill(id int) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	e := c.find(id)
	if e == nil || !e.alive {
		return fmt.Errorf("node %d not found or already dead", id)
	}
	e.node.Stop()
	c.transport.Deregister(id)
	e.alive = false
	e.node = nil
	return nil
}

func (c *Cluster) Revive(id int) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	e := c.find(id)
	if e == nil || e.alive {
		return fmt.Errorf("node %d not found or already alive", id)
	}
	peers := c.alivePeersOf(id)
	node := raft.NewNode(id, peers, c.transport, c.bus)
	c.transport.Register(id, node)
	node.Start()
	e.node = node
	e.alive = true
	return nil
}

// ── Membership changes (graceful add / remove) ────────────────────────────────

// AddNode creates a new node, updates every existing node's peer list,
// and starts the new node. It will catch up via log replication automatically.
func (c *Cluster) AddNode() (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= maxClusterSize {
		return 0, fmt.Errorf("cluster is at maximum size (%d)", maxClusterSize)
	}

	newID := c.nextNodeID
	c.nextNodeID++

	// Tell every existing live node about the new peer.
	for _, e := range c.entries {
		if e.alive && e.node != nil {
			e.node.AddPeer(newID)
		}
	}

	// Build the new node's peer list from currently alive nodes.
	peers := c.alivePeersOf(newID)
	node := raft.NewNode(newID, peers, c.transport, c.bus)
	c.transport.Register(newID, node)
	node.Start()

	c.entries = append(c.entries, &entry{id: newID, node: node, alive: true})
	return newID, nil
}

// RemoveNode gracefully removes a node:
// 1. Updates peer lists on all remaining nodes (quorum adjusts first).
// 2. Stops and deregisters the target node.
// 3. Removes it from the entries slice entirely.
func (c *Cluster) RemoveNode(id int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	e := c.find(id)
	if e == nil {
		return fmt.Errorf("node %d not found", id)
	}
	if !e.alive {
		return fmt.Errorf("node %d is not alive", id)
	}
	if len(c.entries) <= 1 {
		return fmt.Errorf("cannot remove the last node")
	}

	// Update peer lists first so quorum reflects the post-removal size
	// before we actually stop the node.
	for _, other := range c.entries {
		if other.id != id && other.alive && other.node != nil {
			other.node.RemovePeer(id)
		}
	}

	e.node.Stop()
	c.transport.Deregister(id)

	// Remove entry entirely (unlike Kill which keeps it as a tombstone).
	c.entries = removeEntry(c.entries, id)
	return nil
}

// ── Submit ────────────────────────────────────────────────────────────────────

func (c *Cluster) Submit(command string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	for _, e := range c.entries {
		if e.alive && e.node != nil {
			if e.node.Submit(command) {
				return true
			}
		}
	}
	return false
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

func (c *Cluster) Entries() []EntryState {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]EntryState, len(c.entries))
	for i, e := range c.entries {
		out[i] = e.state()
	}
	return out
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func (c *Cluster) find(id int) *entry {
	for _, e := range c.entries {
		if e.id == id {
			return e
		}
	}
	return nil
}

// alivePeersOf returns IDs of all alive nodes except excludeID.
// Called with c.mu held.
func (c *Cluster) alivePeersOf(excludeID int) []int {
	peers := make([]int, 0)
	for _, e := range c.entries {
		if e.alive && e.id != excludeID {
			peers = append(peers, e.id)
		}
	}
	return peers
}

func removeEntry(entries []*entry, id int) []*entry {
	for i, e := range entries {
		if e.id == id {
			return append(entries[:i], entries[i+1:]...)
		}
	}
	return entries
}

func idsUpTo(n int) []int {
	ids := make([]int, n)
	for i := range ids {
		ids[i] = i + 1
	}
	return ids
}

func peersAmong(id int, all []int) []int {
	peers := make([]int, 0, len(all)-1)
	for _, p := range all {
		if p != id {
			peers = append(peers, p)
		}
	}
	return peers
}
