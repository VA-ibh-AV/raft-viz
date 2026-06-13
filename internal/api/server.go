package api

import "net/http"

func NewServer(hub *Hub, chaos *ChaosHandler, submit *SubmitHandler, membership *MembershipHandler, config *ConfigHandler) *http.Server {
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", hub.HandleWS)

	// Chaos — simulate crash / recovery
	mux.HandleFunc("POST /nodes/{id}/kill", chaos.Kill)
	mux.HandleFunc("POST /nodes/{id}/revive", chaos.Revive)

	// Membership — graceful add / remove
	mux.HandleFunc("POST /nodes/add", membership.Add)
	mux.HandleFunc("POST /nodes/{id}/remove", membership.Remove)

	// Log replication
	mux.HandleFunc("POST /submit", submit.Handle)

	// Timing config — heartbeat & election timeouts
	mux.HandleFunc("GET /config/timing", config.Get)
	mux.HandleFunc("POST /config/timing", config.Update)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	return &http.Server{Addr: ":8080", Handler: cors(mux)}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
