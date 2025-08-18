.PHONY: build run docker-up migrate test

build:
	go build -o bin/process-video-service ./cmd/main.go

run:
	go run ./cmd/main.go

test:
	go test ./... -v