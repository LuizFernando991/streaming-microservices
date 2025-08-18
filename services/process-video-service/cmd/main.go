package main

import (
	"process-video-service/internal/adapters/ffmpeg"
	"process-video-service/internal/adapters/rabbitmq"
	"process-video-service/internal/adapters/s3"
	"process-video-service/internal/app"
	"process-video-service/internal/config"
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

	processor.Listen()
}
