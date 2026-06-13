package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"raft-viz/internal/api"
	"raft-viz/internal/cluster"
	"raft-viz/internal/raft"
	"raft-viz/internal/transport"
)

func main() {
	bus := make(chan raft.Event, 256)
	tr := transport.NewMemoryTransport()

	cl := cluster.New(3, tr, bus)
	cl.Start()
	fmt.Println("raft cluster started — 3 nodes")

	hub := api.NewHub(cl, bus)
	chaos := api.NewChaosHandler(cl, bus)
	submit := api.NewSubmitHandler(cl)
	membership := api.NewMembershipHandler(cl, bus)

	go hub.Run()

	srv := api.NewServer(hub, chaos, submit, membership)
	go func() {
		fmt.Println("api :8080  →  open http://localhost:5173")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	fmt.Println("shutting down")
}
