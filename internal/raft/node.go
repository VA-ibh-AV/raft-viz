package raft

import (
	"math/rand"
	"sync"
	"time"
)

type Node struct {
	// ── Identity ──────────────────────────────────────────────────────────────
	id    int
	peers []int

	// ── Raft persistent state ─────────────────────────────────────────────────
	currentTerm int
	votedFor    int
	log         []LogEntry // the actual command log

	// ── Raft volatile state ───────────────────────────────────────────────────
	commitIndex int // highest index known to be committed
	lastApplied int // highest index applied to state machine (phase 5)
	role        Role
	leaderID    int

	// ── Leader-only volatile state (reset on every new leadership) ────────────
	nextIndex  map[int]int // next index to send to each peer
	matchIndex map[int]int // highest index confirmed on each peer

	// ── Concurrency ───────────────────────────────────────────────────────────
	mu      sync.Mutex
	stopped bool

	// ── Wiring ────────────────────────────────────────────────────────────────
	transport Transport
	eventBus  chan<- Event

	// ── Timer ─────────────────────────────────────────────────────────────────
	electionTimer   *time.Timer
	electionTimeout time.Duration

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	stopCh chan struct{}
}

func NewNode(id int, peers []int, transport Transport, bus chan<- Event) *Node {
	n := &Node{
		id:        id,
		peers:     peers,
		transport: transport,
		eventBus:  bus,
		votedFor:  -1,
		leaderID:  -1,
		stopCh:    make(chan struct{}),
	}
	n.electionTimeout = randomElectionTimeout()
	n.electionTimer = time.NewTimer(n.electionTimeout)
	return n
}

func randomElectionTimeout() time.Duration {
	t := GetTiming()
	span := int64(t.ElectionTimeoutMax - t.ElectionTimeoutMin)
	if span < 1 {
		return t.ElectionTimeoutMin
	}
	return t.ElectionTimeoutMin + time.Duration(rand.Int63n(span))
}

func (n *Node) ID() int { return n.id }

func (n *Node) Start() { go n.run() }

func (n *Node) Stop() {
	n.mu.Lock()
	n.stopped = true
	n.mu.Unlock()
	close(n.stopCh)
}

// State returns role/term/leaderId — safe to call from any goroutine.
func (n *Node) State() (role Role, term int, leaderID int) {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.role, n.currentTerm, n.leaderID
}

// LogState returns a snapshot of the log and commitIndex for the UI.
func (n *Node) LogState() (entries []LogEntry, commitIndex int) {
	n.mu.Lock()
	defer n.mu.Unlock()
	out := make([]LogEntry, len(n.log))
	copy(out, n.log)
	return out, n.commitIndex
}

func (n *Node) run() {
	heartbeatTimer := time.NewTimer(GetTiming().HeartbeatInterval)
	defer heartbeatTimer.Stop()

	for {
		select {
		case <-n.stopCh:
			n.electionTimer.Stop()
			return

		case <-n.electionTimer.C:
			n.mu.Lock()
			isLeader := n.role == Leader
			n.mu.Unlock()
			if !isLeader {
				go n.startElection()
			}

		case <-heartbeatTimer.C:
			n.mu.Lock()
			isLeader := n.role == Leader
			n.mu.Unlock()
			if isLeader {
				go n.sendHeartbeats()
			}
			heartbeatTimer.Reset(GetTiming().HeartbeatInterval)
		}
	}
}

func (n *Node) quorum() int {
	return (len(n.peers)+1)/2 + 1
}

func (n *Node) resetElectionTimer() {
	if !n.electionTimer.Stop() {
		select {
		case <-n.electionTimer.C:
		default:
		}
	}
	n.electionTimeout = randomElectionTimeout()
	n.electionTimer.Reset(n.electionTimeout)
}

func (n *Node) emit(e Event) {
	select {
	case n.eventBus <- e:
	default:
	}
}

// AddPeer adds a new peer at runtime. If this node is the leader
// it also initialises nextIndex/matchIndex for the new peer.
func (n *Node) AddPeer(id int) {
	n.mu.Lock()
	defer n.mu.Unlock()
	for _, p := range n.peers {
		if p == id {
			return
		}
	}
	n.peers = append(n.peers, id)
	if n.role == Leader {
		lastIdx, _ := n.lastLogIndexAndTerm()
		n.nextIndex[id] = lastIdx + 1
		n.matchIndex[id] = 0
	}
}

// RemovePeer removes a peer at runtime.
func (n *Node) RemovePeer(id int) {
	n.mu.Lock()
	defer n.mu.Unlock()
	for i, p := range n.peers {
		if p == id {
			n.peers = append(n.peers[:i], n.peers[i+1:]...)
			delete(n.nextIndex, id)
			delete(n.matchIndex, id)
			return
		}
	}
}
