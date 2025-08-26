.PHONY: build run docker-up migrate test

ifneq (,$(wildcard ./.env))
    include .env
    export
endif

MIGRATIONS_DIR=./migrations
BINARY=bin/catalog-service

build:
	go build -o $(BINARY) ./cmd/main.go

run:
	go run ./cmd/main.go

test:
	go test ./... -v

migrate-new:
	@migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

migrate-up:
	@migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

migrate-down:
	@migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

migrate-version:
	@migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" version

migrate-reset:
	@migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" drop -f
	@migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up