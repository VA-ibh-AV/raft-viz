package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"raft-viz/internal/cluster"
	"raft-viz/internal/raft"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ── Wire types ────────────────────────────────────────────────────────────────

type NodeSnapshot struct {
	ID          int             `json:"id"`
	Role        string          `json:"role"`
	Term        int             `json:"term"`
	LeaderID    int             `json:"leaderId"`
	Alive       bool            `json:"alive"`
	Log         []raft.LogEntry `json:"log"`
	CommitIndex int             `json:"commitIndex"`
}

type EventMsg struct {
	Type        string `json:"type"`
	NodeID      int    `json:"nodeId"`
	Role        string `json:"role,omitempty"`
	VotedFor    int    `json:"votedFor,omitempty"`
	Command     string `json:"command,omitempty"`
	LogIndex    int    `json:"logIndex,omitempty"`
	CommitIndex int    `json:"commitIndex,omitempty"`
}

type Message struct {
	Nodes []NodeSnapshot `json:"nodes"`
	Event *EventMsg      `json:"event,omitempty"`
}

// ── Hub ───────────────────────────────────────────────────────────────────────

type Hub struct {
	cluster  *cluster.Cluster
	eventBus <-chan raft.Event

	clients map[*websocket.Conn]chan []byte
	mu      sync.RWMutex

	recentEvents []raft.Event
	eventsMu     sync.RWMutex
}

func NewHub(cl *cluster.Cluster, bus <-chan raft.Event) *Hub {
	return &Hub{
		cluster:  cl,
		eventBus: bus,
		clients:  make(map[*websocket.Conn]chan []byte),
	}
}

func (h *Hub) Run() {
	for event := range h.eventBus {
		if event.Type == raft.EventHeartbeat {
			continue
		}

		h.eventsMu.Lock()
		h.recentEvents = append(h.recentEvents, event)
		if len(h.recentEvents) > 50 {
			h.recentEvents = h.recentEvents[1:]
		}
		h.eventsMu.Unlock()

		data := h.buildMessage(event)

		h.mu.RLock()
		for _, ch := range h.clients {
			select {
			case ch <- data:
			default:
			}
		}
		h.mu.RUnlock()
	}
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}

	ch := make(chan []byte, 64)

	h.mu.Lock()
	h.clients[conn] = ch
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		close(ch)
		conn.Close()
	}()

	go func() {
		for data := range ch {
			if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		}
	}()

	ch <- h.buildMessage(raft.Event{})

	h.eventsMu.RLock()
	history := make([]raft.Event, len(h.recentEvents))
	copy(history, h.recentEvents)
	h.eventsMu.RUnlock()

	for _, e := range history {
		ch <- h.buildMessage(e)
	}

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (h *Hub) buildMessage(e raft.Event) []byte {
	entries := h.cluster.Entries()
	snapshots := make([]NodeSnapshot, len(entries))
	for i, s := range entries {
		snapshots[i] = NodeSnapshot{
			ID:          s.ID,
			Role:        s.Role,
			Term:        s.Term,
			LeaderID:    s.LeaderID,
			Alive:       s.Alive,
			Log:         s.Log,
			CommitIndex: s.CommitIndex,
		}
	}

	msg := Message{Nodes: snapshots}

	if e.Type != "" {
		em := &EventMsg{Type: string(e.Type), NodeID: e.NodeID}
		switch e.Type {
		case raft.EventRoleChanged:
			if role, ok := e.Data.(raft.Role); ok {
				em.Role = role.String()
			}
		case raft.EventVoteGranted:
			if voted, ok := e.Data.(int); ok {
				em.VotedFor = voted
			}
		case raft.EventLogAppended:
			if entry, ok := e.Data.(raft.LogEntry); ok {
				em.Command = entry.Command
				em.LogIndex = entry.Index
			}
		case raft.EventLogCommitted:
			if idx, ok := e.Data.(int); ok {
				em.CommitIndex = idx
			}
		}
		msg.Event = em
	}

	data, _ := json.Marshal(msg)
	return data
}
