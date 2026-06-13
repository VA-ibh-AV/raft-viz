package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"raft-viz/internal/cluster"
	"raft-viz/internal/raft"
)

type ChaosHandler struct {
	cluster *cluster.Cluster
	bus     chan<- raft.Event
}

func NewChaosHandler(cl *cluster.Cluster, bus chan<- raft.Event) *ChaosHandler {
	return &ChaosHandler{cluster: cl, bus: bus}
}

func (h *ChaosHandler) Kill(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid node id", http.StatusBadRequest)
		return
	}

	if err := h.cluster.Kill(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Push event into bus — hub.Run() picks it up and broadcasts
	// updated snapshot (with this node now showing as DEAD).
	h.bus <- raft.Event{Type: raft.EventNodeKilled, NodeID: id}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "killed"})
}

func (h *ChaosHandler) Revive(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid node id", http.StatusBadRequest)
		return
	}

	if err := h.cluster.Revive(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.bus <- raft.Event{Type: raft.EventNodeRevived, NodeID: id}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "revived"})
}
