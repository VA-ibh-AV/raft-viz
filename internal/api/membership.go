package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"raft-viz/internal/cluster"
	"raft-viz/internal/raft"
)

type MembershipHandler struct {
	cluster *cluster.Cluster
	bus     chan<- raft.Event
}

func NewMembershipHandler(cl *cluster.Cluster, bus chan<- raft.Event) *MembershipHandler {
	return &MembershipHandler{cluster: cl, bus: bus}
}

// Add creates a new node and adds it to the running cluster.
func (h *MembershipHandler) Add(w http.ResponseWriter, r *http.Request) {
	id, err := h.cluster.AddNode()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Emit synthetic event so the hub broadcasts an updated snapshot
	// that includes the new node.
	h.bus <- raft.Event{Type: raft.EventNodeAdded, NodeID: id}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"status": "added", "id": id})
}

// Remove gracefully removes a node from the cluster.
func (h *MembershipHandler) Remove(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid node id", http.StatusBadRequest)
		return
	}

	if err := h.cluster.RemoveNode(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.bus <- raft.Event{Type: raft.EventNodeRemoved, NodeID: id}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
}
