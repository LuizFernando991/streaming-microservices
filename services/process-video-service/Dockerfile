FROM golang:1.23.4 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bin/process-video-service ./cmd/main.go

FROM jrottenberg/ffmpeg:6.0-nvidia

WORKDIR /app

COPY --from=builder /app/bin/process-video-service .

ENV PATH="/usr/local/bin:${PATH}"

EXPOSE 8080

ENTRYPOINT ["./process-video-service"]