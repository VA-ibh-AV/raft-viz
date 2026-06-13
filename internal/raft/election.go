package raft

import "sync"

// ── Starting an election ──────────────────────────────────────────────────────

func (n *Node) startElection() {
	n.mu.Lock()
	if n.stopped {
		n.mu.Unlock()
		return
	}
	n.currentTerm++
	n.role = Candidate
	n.votedFor = n.id
	term := n.currentTerm
	peers := append([]int{}, n.peers...)
	// Include our log position so voters can check we're up-to-date.
	lastIdx, lastTerm := n.lastLogIndexAndTerm()
	n.resetElectionTimer()
	n.mu.Unlock()

	n.emit(Event{NodeID: n.id, Type: EventRoleChanged, Data: Candidate})

	var (
		mu    sync.Mutex
		votes = 1
	)

	for _, peerID := range peers {
		go func(pid int) {
			resp, err := n.transport.SendRequestVote(pid, RequestVoteRequest{
				Term:         term,
				CandidateID:  n.id,
				LastLogIndex: lastIdx,
				LastLogTerm:  lastTerm,
			})
			if err != nil {
				return
			}

			n.mu.Lock()
			defer n.mu.Unlock()

			if resp.Term > n.currentTerm {
				n.becomeFollower(resp.Term)
				return
			}
			if !resp.VoteGranted || n.role != Candidate || n.currentTerm != term {
				return
			}

			mu.Lock()
			votes++
			v := votes
			mu.Unlock()

			if v >= n.quorum() {
				n.becomeLeader()
			}
		}(peerID)
	}
}

// ── Handling a RequestVote RPC ────────────────────────────────────────────────

func (n *Node) HandleRequestVote(req RequestVoteRequest) RequestVoteResponse {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.stopped {
		return RequestVoteResponse{Term: n.currentTerm, VoteGranted: false}
	}

	if req.Term > n.currentTerm {
		n.becomeFollower(req.Term)
	}
	if req.Term < n.currentTerm {
		return RequestVoteResponse{Term: n.currentTerm, VoteGranted: false}
	}

	alreadyVoted := n.votedFor != -1 && n.votedFor != req.CandidateID
	if alreadyVoted {
		return RequestVoteResponse{Term: n.currentTerm, VoteGranted: false}
	}

	// Log up-to-date check.
	// A candidate is "at least as up-to-date" if:
	//   its last log term is higher, OR
	//   same last log term and its log is at least as long.
	myLastIdx, myLastTerm := n.lastLogIndexAndTerm()
	candidateUpToDate := req.LastLogTerm > myLastTerm ||
		(req.LastLogTerm == myLastTerm && req.LastLogIndex >= myLastIdx)
	if !candidateUpToDate {
		return RequestVoteResponse{Term: n.currentTerm, VoteGranted: false}
	}

	n.votedFor = req.CandidateID
	n.resetElectionTimer()
	n.emit(Event{NodeID: n.id, Type: EventVoteGranted, Data: req.CandidateID})
	return RequestVoteResponse{Term: n.currentTerm, VoteGranted: true}
}

// ── Role transitions (called with n.mu held) ──────────────────────────────────

func (n *Node) becomeFollower(term int) {
	n.currentTerm = term
	n.role = Follower
	n.votedFor = -1
	n.leaderID = -1
	n.resetElectionTimer()
	n.emit(Event{NodeID: n.id, Type: EventRoleChanged, Data: Follower})
}

func (n *Node) becomeLeader() {
	n.role = Leader
	n.leaderID = n.id
	n.electionTimer.Stop()

	// Initialise leader-only state.
	// nextIndex starts optimistically at our last log index + 1.
	// matchIndex starts at 0 (nothing confirmed yet).
	lastIdx, _ := n.lastLogIndexAndTerm()
	n.nextIndex = make(map[int]int)
	n.matchIndex = make(map[int]int)
	for _, pid := range n.peers {
		n.nextIndex[pid] = lastIdx + 1
		n.matchIndex[pid] = 0
	}

	n.emit(Event{NodeID: n.id, Type: EventRoleChanged, Data: Leader})
	go n.sendHeartbeats()
}

// sendHeartbeats replicates the log (or sends an empty heartbeat) to every peer.
func (n *Node) sendHeartbeats() {
	n.mu.Lock()
	if n.stopped || n.role != Leader {
		n.mu.Unlock()
		return
	}
	term := n.currentTerm
	peers := append([]int{}, n.peers...)
	n.mu.Unlock()

	for _, pid := range peers {
		// replicateToPeer handles both the heartbeat case (no new entries)
		// and the replication case (entries to send). One function does both.
		go n.replicateToPeer(pid, term)
	}
}
