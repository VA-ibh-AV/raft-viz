package api

import (
	"encoding/json"
	"net/http"

	"raft-viz/internal/cluster"
)

type SubmitHandler struct {
	cluster *cluster.Cluster
}

func NewSubmitHandler(cl *cluster.Cluster) *SubmitHandler {
	return &SubmitHandler{cluster: cl}
}

func (h *SubmitHandler) Handle(w http.ResponseWriter, r *http.Request) {
	cmd := r.URL.Query().Get("cmd")
	if cmd == "" {
		http.Error(w, "cmd query param required", http.StatusBadRequest)
		return
	}

	if !h.cluster.Submit(cmd) {
		http.Error(w, "no leader available", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "submitted",
		"command": cmd,
	})
}
