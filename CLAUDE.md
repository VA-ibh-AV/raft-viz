# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Go)
```bash
go run ./cmd/server/          # start API on :8080
go build ./...                # build check
go vet ./...                  # lint
go test ./...                 # run all tests
go test ./internal/raft/...   # run single package tests
go mod tidy                   # sync dependencies
```

### Frontend (React + Vite) — run from `ui/`
```bash
npm run dev      # dev server on :5173
npm run build    # tsc + vite build
npm run lint     # eslint
```

Both must run simultaneously. Backend serves API/WebSocket on `:8080`; frontend proxies via Vite.

## Architecture

**Data flow:** Raft nodes (goroutines) → `chan raft.Event` (buffered 256) → WebSocket hub → browser.

The event bus is the backbone. Every meaningful state change emits an `Event{NodeID, Type, Data}` onto the bus. The hub reads it, builds a full `Message{Nodes []NodeSnapshot, Event *EventMsg}`, and broadcasts JSON to all connected clients. The frontend is purely reactive — it holds no derived state; every render comes from the latest WebSocket message.

### Go packages

| Package | Responsibility |
|---|---|
| `internal/raft` | Core algorithm: `Node` struct, election loop, log replication, RPC types |
| `internal/transport` | In-memory transport (direct function calls, no network) |
| `internal/cluster` | Node lifecycle: `Kill`, `Revive`, `AddNode`, `RemoveNode`; owns the node registry |
| `internal/api` | HTTP mux, WebSocket hub, chaos/submit/membership handlers |
| `cmd/server` | Entry point: wires bus + transport + cluster + hub + HTTP server |

### Key Go files

- `internal/raft/node.go` — `Node` struct, main run loop, `AddPeer`/`RemovePeer`
- `internal/raft/election.go` — `startElection`, `HandleRequestVote`, role transitions
- `internal/raft/log.go` — `Submit`, `replicateToPeer`, `HandleAppendEntries`, `maybeAdvanceCommitIndex`
- `internal/raft/types.go` — all shared types: `Role`, `LogEntry`, RPC structs, `Event`/`EventType`
- `internal/api/hub.go` — WebSocket hub, `buildMessage` (snapshot + event → JSON), event history (last 50, replayed on connect)
- `internal/cluster/cluster.go` — single-server membership change logic

### React frontend (`ui/src/`)

- `types.ts` — `NodeSnapshot`, `LogEntry`, `RaftEvent` mirror the Go wire types exactly
- `hooks/useCluster.ts` — WebSocket connection with auto-reconnect (2 s); produces `{nodes, events, connected}`
- `hooks/useControls.ts` — `fetch` wrappers for all POST endpoints
- `components/ClusterCanvas.tsx` — SVG, circular node layout, per-node log panels
- `components/EventLog.tsx` — scrolling feed, capped at 40 events client-side

## API endpoints

```
GET  /ws                      WebSocket — full cluster state on connect + on every event
POST /nodes/{id}/kill         simulate crash
POST /nodes/{id}/revive       bring back
POST /nodes/add               add one node (max 7 total)
POST /nodes/{id}/remove       graceful remove
POST /submit?cmd=SET+x+1      submit a command to leader
GET  /health                  200 OK
```

## Important constraints

- **Transport is in-memory only** (`internal/transport/memory.go`) — no TCP, no serialization. Raft RPCs are direct function calls.
- **No persistence** — all state is in-memory; restart resets everything.
- **Membership uses single-server changes** — add/remove one node at a time to guarantee overlapping majorities.
- **Hub filters heartbeats** — `EventHeartbeat` is dropped in `hub.Run()` to reduce WebSocket noise; all other events are stored and broadcast.
- **Go 1.22 enhanced mux** — route patterns use method prefix (`POST /nodes/{id}/kill`); requires Go 1.22+.
