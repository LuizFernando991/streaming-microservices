package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"process-video-service/internal/adapters/ffmpeg"
	"process-video-service/internal/adapters/rabbitmq"
	"process-video-service/internal/adapters/s3"
	"process-video-service/internal/app"
	"process-video-service/internal/config"
	"syscall"
	"time"
)

func main() {
	cfg, err := config.LoadEnv(".env")

	if err != nil {
		panic(err)
	}

	rmqConn := rabbitmq.New(cfg.RabbitMQUrl)
	defer rmqConn.Close()

	s3Client := s3.New(cfg.BucketURL, cfg.BucketKey, cfg.BucketSecret)

	s3Client.EnsureBucketExists(cfg.BucketProcessedName)

	ffmpeg := ffmpeg.NewFFMPEGProcessor(s3Client, cfg.BucketProcessedName, cfg.EnableGPUProcess, cfg.EnableGPUScaleNPP)

	processor := app.NewProcessor(cfg, rmqConn, s3Client, ffmpeg, cfg.BucketProcessedName)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "running",
		})
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		fmt.Println("Http server running on :" + cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			panic(err)
		}
	}()

	processCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go processor.Listen(processCtx)

	<-processCtx.Done()

	shutdownServerCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(shutdownServerCtx)

}
