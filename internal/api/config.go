package api

import (
	"encoding/json"
	"net/http"
	"time"

	"raft-viz/internal/raft"
)

type ConfigHandler struct{}

func NewConfigHandler() *ConfigHandler { return &ConfigHandler{} }

type timingDTO struct {
	HeartbeatMs       int `json:"heartbeatMs"`
	ElectionMinMs     int `json:"electionMinMs"`
	ElectionMaxMs     int `json:"electionMaxMs"`
}

func toDTO(t raft.Timing) timingDTO {
	return timingDTO{
		HeartbeatMs:   int(t.HeartbeatInterval / time.Millisecond),
		ElectionMinMs: int(t.ElectionTimeoutMin / time.Millisecond),
		ElectionMaxMs: int(t.ElectionTimeoutMax / time.Millisecond),
	}
}

func (h *ConfigHandler) Get(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toDTO(raft.GetTiming()))
}

func (h *ConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	var in timingDTO
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	updated := raft.SetTiming(raft.Timing{
		HeartbeatInterval:  time.Duration(in.HeartbeatMs) * time.Millisecond,
		ElectionTimeoutMin: time.Duration(in.ElectionMinMs) * time.Millisecond,
		ElectionTimeoutMax: time.Duration(in.ElectionMaxMs) * time.Millisecond,
	})
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toDTO(updated))
}
