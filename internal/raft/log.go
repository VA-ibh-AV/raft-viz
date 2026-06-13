package raft

// ── Helpers ───────────────────────────────────────────────────────────────────

// lastLogIndexAndTerm returns the index and term of the last log entry.
// Returns (0, 0) if the log is empty. Called with n.mu held.
func (n *Node) lastLogIndexAndTerm() (int, int) {
	if len(n.log) == 0 {
		return 0, 0
	}
	last := n.log[len(n.log)-1]
	return last.Index, last.Term
}

// ── Client command submission ─────────────────────────────────────────────────

// Submit appends a command to the leader's log and triggers replication.
// Returns false if this node is not the leader.
func (n *Node) Submit(command string) bool {
	n.mu.Lock()
	if n.role != Leader || n.stopped {
		n.mu.Unlock()
		return false
	}
	entry := LogEntry{
		Index:   len(n.log) + 1,
		Term:    n.currentTerm,
		Command: command,
	}
	n.log = append(n.log, entry)
	term := n.currentTerm
	n.emit(Event{NodeID: n.id, Type: EventLogAppended, Data: entry})
	n.mu.Unlock()

	go n.replicateLog(term)
	return true
}

func (n *Node) replicateLog(term int) {
	n.mu.Lock()
	if n.role != Leader || n.currentTerm != term {
		n.mu.Unlock()
		return
	}
	peers := append([]int{}, n.peers...)
	n.mu.Unlock()

	for _, pid := range peers {
		go n.replicateToPeer(pid, term)
	}
}

// ── Core replication loop ─────────────────────────────────────────────────────

// replicateToPeer sends AppendEntries to one peer, retrying with a backed-up
// nextIndex until the peer accepts or we lose leadership.
func (n *Node) replicateToPeer(pid, term int) {
	for {
		n.mu.Lock()
		if n.stopped || n.role != Leader || n.currentTerm != term {
			n.mu.Unlock()
			return
		}

		nextIdx := n.nextIndex[pid]
		prevLogIndex := nextIdx - 1
		prevLogTerm := 0
		if prevLogIndex >= 1 && prevLogIndex <= len(n.log) {
			prevLogTerm = n.log[prevLogIndex-1].Term
		}

		var entries []LogEntry
		if nextIdx <= len(n.log) {
			slice := n.log[nextIdx-1:]
			entries = make([]LogEntry, len(slice))
			copy(entries, slice)
		}

		req := AppendEntriesRequest{
			Term:         term,
			LeaderID:     n.id,
			PrevLogIndex: prevLogIndex,
			PrevLogTerm:  prevLogTerm,
			Entries:      entries,
			LeaderCommit: n.commitIndex,
		}
		n.mu.Unlock()

		resp, err := n.transport.SendAppendEntries(pid, req)
		if err != nil {
			return
		}

		n.mu.Lock()

		if resp.Term > n.currentTerm {
			n.becomeFollower(resp.Term)
			n.mu.Unlock()
			return
		}

		if n.role != Leader || n.currentTerm != term {
			n.mu.Unlock()
			return
		}

		if resp.Success {
			newMatch := prevLogIndex + len(entries)
			if newMatch > n.matchIndex[pid] {
				n.matchIndex[pid] = newMatch
			}
			n.nextIndex[pid] = n.matchIndex[pid] + 1
			n.maybeAdvanceCommitIndex()
			n.mu.Unlock()
			return
		}

		if n.nextIndex[pid] > 1 {
			n.nextIndex[pid]--
		}
		n.mu.Unlock()
	}
}

// ── Committing ────────────────────────────────────────────────────────────────

// maybeAdvanceCommitIndex finds the highest index N where:
//  1. N > commitIndex
//  2. log[N-1].Term == currentTerm
//  3. matchIndex[i] >= N for a majority
//
// Called with n.mu held.
func (n *Node) maybeAdvanceCommitIndex() {
	for idx := len(n.log); idx > n.commitIndex; idx-- {
		if n.log[idx-1].Term != n.currentTerm {
			continue
		}
		count := 1
		for _, pid := range n.peers {
			if n.matchIndex[pid] >= idx {
				count++
			}
		}
		if count >= n.quorum() {
			n.commitIndex = idx
			n.emit(Event{NodeID: n.id, Type: EventLogCommitted, Data: idx})
			break
		}
	}
}

// ── Receiving AppendEntries ───────────────────────────────────────────────────

func (n *Node) HandleAppendEntries(req AppendEntriesRequest) AppendEntriesResponse {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.stopped {
		return AppendEntriesResponse{Term: n.currentTerm, Success: false}
	}

	if req.Term < n.currentTerm {
		return AppendEntriesResponse{Term: n.currentTerm, Success: false}
	}

	if req.Term > n.currentTerm || n.role == Candidate {
		n.becomeFollower(req.Term)
	}
	n.leaderID = req.LeaderID
	n.resetElectionTimer()
	n.emit(Event{NodeID: n.id, Type: EventHeartbeat, Data: req.LeaderID})

	// Consistency check
	if req.PrevLogIndex > 0 {
		if req.PrevLogIndex > len(n.log) {
			return AppendEntriesResponse{Term: n.currentTerm, Success: false}
		}
		if n.log[req.PrevLogIndex-1].Term != req.PrevLogTerm {
			n.log = n.log[:req.PrevLogIndex-1]
			return AppendEntriesResponse{Term: n.currentTerm, Success: false}
		}
	}

	// Append entries
	if len(req.Entries) > 0 {
		n.log = append(n.log[:req.PrevLogIndex], req.Entries...)
		for _, e := range req.Entries {
			n.emit(Event{NodeID: n.id, Type: EventLogAppended, Data: e})
		}
	}

	// Advance commit index
	if req.LeaderCommit > n.commitIndex {
		n.commitIndex = min(req.LeaderCommit, len(n.log))
		if n.commitIndex > 0 {
			n.emit(Event{NodeID: n.id, Type: EventLogCommitted, Data: n.commitIndex})
		}
	}

	return AppendEntriesResponse{Term: n.currentTerm, Success: true}
}
