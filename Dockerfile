# syntax=docker/dockerfile:1.7

# ── Build ──────────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS build

WORKDIR /src

# Cache modules first
COPY go.mod go.sum ./
RUN go mod download

# Source
COPY cmd     ./cmd
COPY internal ./internal

# Static binary, stripped
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /out/server \
    ./cmd/server

# ── Runtime ────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=build /out/server /app/server

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
