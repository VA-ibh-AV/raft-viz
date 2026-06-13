# raft-viz

An interactive visualizer for the **Raft consensus algorithm** built from scratch in Go and React. Watch leader elections fire in real time, submit commands and see them replicate across nodes, crash nodes and watch the cluster re-elect, and add or remove nodes while the cluster stays live.

---

## What is Raft?

Raft is a consensus algorithm that lets a cluster of servers agree on a shared log of commands — even when some servers crash or messages are delayed. It is the foundation of distributed systems like **etcd** (Kubernetes), **CockroachDB**, **NATS JetStream**, and **Consul**.

Raft breaks the problem into three sub-problems:

- **Leader election** — one node is elected leader per term; all writes go through it
- **Log replication** — the leader replicates commands to followers before committing
- **Membership changes** — nodes can join or leave the cluster while it stays available

This project implements all three and visualises every step in the browser.

---

## Features

| Phase | What it covers |
|-------|---------------|
| **Leader election** | Randomised election timeouts, RequestVote RPCs, term-based safety, split-vote resolution |
| **Live WebSocket stream** | Every state change pushed to the browser over WebSocket; event history replayed on connect |
| **Chaos controls** | Click a node to kill it (simulates crash), click again to revive; watch re-election happen |
| **Log replication** | Submit commands via UI; watch entries appear on each node's log and turn green on commit |
| **Membership changes** | Add up to 7 nodes at runtime; new node catches up automatically; remove nodes gracefully |

---

## Architecture

```
Browser (React + Vite)
    │
    │  WebSocket /ws   (live cluster state)
    │  HTTP POST       (kill, revive, submit, add, remove)
    │
Go HTTP server (:8080)
    │
    ├── WebSocket hub   reads event bus → broadcasts JSON snapshots
    ├── Chaos handler   kill / revive (simulates crash)
    ├── Submit handler  POST /submit?cmd=SET+x+1
    └── Membership      POST /nodes/add  |  POST /nodes/{id}/remove
    │
Raft cluster  (goroutines, in-memory transport)
    ├── Node 1  [Leader]
    ├── Node 2  [Follower]
    └── Node 3  [Follower]
```

**Go backend** runs real Raft nodes as goroutines communicating over an in-memory transport. Each meaningful state change (role change, vote granted, log append, commit) is emitted as an event onto a shared channel. The WebSocket hub reads that channel, builds a full cluster snapshot, and pushes it to every connected browser client.

**React frontend** maintains no local state beyond what the WebSocket delivers. Every render is driven by the latest snapshot from the server.

---

## Project structure

```
raft-viz/
│
├── cmd/server/main.go              Entry point — boots cluster + HTTP server
│
├── internal/
│   ├── raft/
│   │   ├── types.go               Role, LogEntry, RPC types, Event types
│   │   ├── transport.go           Transport interface
│   │   ├── node.go                Node struct, run loop, AddPeer / RemovePeer
│   │   ├── election.go            startElection, HandleRequestVote, role transitions
│   │   └── log.go                 Submit, replicateToPeer, HandleAppendEntries,
│   │                              maybeAdvanceCommitIndex
│   │
│   ├── transport/
│   │   └── memory.go              In-memory transport (direct function calls)
│   │
│   ├── cluster/
│   │   └── cluster.go             Node lifecycle — Kill, Revive, AddNode, RemoveNode
│   │
│   └── api/
│       ├── hub.go                 WebSocket hub + cluster snapshot builder
│       ├── server.go              HTTP mux + CORS
│       ├── chaos.go               POST /nodes/{id}/kill|revive
│       ├── submit.go              POST /submit
│       └── membership.go          POST /nodes/add  |  POST /nodes/{id}/remove
│
└── ui/
    └── src/
        ├── App.tsx                Layout: header + canvas + event log + submit bar
        ├── types.ts               NodeSnapshot, LogEntry, RaftEvent
        ├── hooks/
        │   ├── useCluster.ts      WebSocket connection → nodes + events state
        │   └── useControls.ts     API call helpers (kill, revive, submit, add, remove)
        └── components/
            ├── ClusterCanvas.tsx  SVG canvas with circular layout + log panels
            └── EventLog.tsx       Scrolling event feed
```

---

## Getting started

**Prerequisites:** Go 1.22+, Node.js 18+

### 1. Clone and install

```bash
git clone https://github.com/your-username/raft-viz
cd raft-viz

# Go dependencies
go mod tidy

# React dependencies
cd ui && npm install && cd ..
```

### 2. Start the Go server

```bash
go run ./cmd/server/
# api :8080  →  open http://localhost:5173
```

### 3. Start the React dev server

```bash
cd ui && npm run dev
```

Open **http://localhost:5173**. You will see three nodes in a triangle. Within ~300 ms one becomes leader (green), the others become followers (gray).

---

## Using the UI

| Action | How |
|--------|-----|
| Kill a node | Click a live node — it goes offline (dimmed ✕) |
| Revive a node | Click an offline node |
| Remove a node | Click the **−** button on the node's top-right corner |
| Add a node | Click **+ add node** in the header |
| Submit a command | Type in the bottom bar and press Enter or click Submit |

### Things to try

```
1. Submit "SET x 1" — watch it replicate to all nodes and commit (turn green)

2. Kill the leader — watch re-election happen in ~300 ms

3. Submit a command while only two nodes are alive — still commits (2/3 = quorum)

4. Kill two nodes — submit a command — cluster freezes (no quorum)
   Revive one node — cluster re-elects and the frozen command commits

5. Add a fourth node — submit commands — watch N4 catch up
   (log panel fills from scratch via automatic replication)

6. Remove a node gracefully — cluster contracts, quorum recalculates immediately
```

---

## Algorithm implementation

### Leader election

Every node starts as a **Follower** with a randomised election timeout (150–300 ms). If no heartbeat arrives before the timer fires, the node becomes a **Candidate**, increments its term, votes for itself, and sends `RequestVote` RPCs to all peers concurrently. A candidate needs `⌊N/2⌋ + 1` votes to win. The winner immediately sends heartbeats to suppress other elections.

Key safety rules enforced:
- A node votes for at most one candidate per term
- A candidate's log must be at least as up-to-date as the voter's (prevents stale nodes from winning)
- Any message carrying a higher term causes immediate demotion to Follower

### Log replication

The leader appends a new `LogEntry{Index, Term, Command}` to its log first, then replicates it to followers via `AppendEntries`. Each request carries `prevLogIndex` and `prevLogTerm` — the follower rejects if its log does not match at that position, and the leader backs up `nextIndex[peer]` by one and retries. This loop automatically catches up any follower regardless of how far behind it is, including a brand-new empty node.

An entry is **committed** once the leader observes `matchIndex[i] ≥ N` for a majority of nodes. The leader only commits entries from its own term directly; entries from previous terms are committed as a side effect (the "term safety" rule from the Raft paper).

### Membership changes

Uses the **single-server change** approach from the Raft dissertation: add or remove one node at a time. This guarantees that the old majority and new majority always overlap, preventing two simultaneous leaders during the transition.

- `AddNode` — updates peer lists on all existing nodes, then starts the new node; it catches up via normal log replication
- `RemoveNode` — updates peer lists on surviving nodes first (quorum adjusts immediately), then stops the departing node

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Algorithm | Go 1.22 — pure stdlib, no Raft library |
| Transport | In-memory (direct function calls + mutexes) |
| WebSocket | gorilla/websocket |
| HTTP server | Go net/http (1.22 enhanced mux) |
| Frontend | React 18, TypeScript, Vite |
| Visualisation | SVG (inline, no canvas library) |

---

## What's not implemented

This is a learning project focused on clarity over production readiness. The following are intentional omissions:

- **Persistent storage** — node state is in-memory; a real implementation writes `currentTerm`, `votedFor`, and `log[]` to disk before responding to any RPC
- **Log compaction / snapshots** — logs grow unboundedly; production systems periodically snapshot the state machine and discard old entries
- **Linearisable reads** — read-only queries need additional coordination to avoid stale reads from a deposed leader
- **Pre-vote** — prevents disruption from partitioned nodes incrementing their term before rejoining

---

## References

- [In Search of an Understandable Consensus Algorithm (Raft paper)](https://raft.github.io/raft.pdf) — Ongaro & Ousterhout, 2014
- [Raft dissertation](https://web.stanford.edu/~ouster/cgi-bin/papers/OngaroPhD.pdf) — membership changes and other extensions
- [The Raft website](https://raft.github.io) — interactive visualiser and reading list