package raft

import (
	"sync"
	"time"
)

// Timing controls the heartbeat cadence and election timeout window.
// All durations are read/written through GetTiming and SetTiming.
type Timing struct {
	HeartbeatInterval  time.Duration
	ElectionTimeoutMin time.Duration
	ElectionTimeoutMax time.Duration
}

var (
	timingMu sync.RWMutex
	timing   = Timing{
		HeartbeatInterval:  300 * time.Millisecond,
		ElectionTimeoutMin: 1500 * time.Millisecond,
		ElectionTimeoutMax: 3000 * time.Millisecond,
	}
)

// GetTiming returns a snapshot of the current timing configuration.
func GetTiming() Timing {
	timingMu.RLock()
	defer timingMu.RUnlock()
	return timing
}

// SetTiming updates the timing configuration. Values <= 0 are ignored.
// ElectionTimeoutMax is clamped to be >= ElectionTimeoutMin.
func SetTiming(t Timing) Timing {
	timingMu.Lock()
	defer timingMu.Unlock()
	if t.HeartbeatInterval > 0 {
		timing.HeartbeatInterval = t.HeartbeatInterval
	}
	if t.ElectionTimeoutMin > 0 {
		timing.ElectionTimeoutMin = t.ElectionTimeoutMin
	}
	if t.ElectionTimeoutMax > 0 {
		timing.ElectionTimeoutMax = t.ElectionTimeoutMax
	}
	if timing.ElectionTimeoutMax < timing.ElectionTimeoutMin {
		timing.ElectionTimeoutMax = timing.ElectionTimeoutMin
	}
	return timing
}
