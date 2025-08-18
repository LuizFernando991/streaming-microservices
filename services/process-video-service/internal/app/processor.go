package app

import (
	"bytes"
	"context"
	"fmt"
	"sync"

	"process-video-service/internal/config"
	helpers "process-video-service/internal/helpers"
	"process-video-service/internal/interfaces"
	"process-video-service/internal/models"
)

type Processor struct {
	queue                     interfaces.Queue
	bucket                    interfaces.Bucket
	video                     interfaces.VideoProcessor
	uploadQueueName           string
	processedVideoQueueName   string
	failProcessVideoQueueName string
	processBucketName         string
	logger                    config.Logger
}

func NewProcessor(cfg *config.Config, queue interfaces.Queue, bucket interfaces.Bucket, video interfaces.VideoProcessor, processBucketName string) *Processor {
	return &Processor{
		queue:                     queue,
		bucket:                    bucket,
		video:                     video,
		uploadQueueName:           cfg.UploadVideoQueue,
		processedVideoQueueName:   cfg.ProcessedVideoQueue,
		failProcessVideoQueueName: cfg.FailProcessVideoQueue,
		processBucketName:         processBucketName,
		logger:                    *config.NewLogger("Processor"),
	}
}

func (p *Processor) Listen() {
	p.queue.Consume(p.uploadQueueName, func(event models.UploadEvent, ack func(), nack func(requeue bool)) {

		p.logger.Infof("Event recived: key=%s episodeId=%s bucket=%s", event.Key, event.EpId, event.Bucket)

		if err := p.ProcessVideo(event); err != nil {
			p.logger.Error("Erro on process", err)

			p.logger.Info("Cleannig: ", event.Key)
			_ = p.bucket.DeletePrefix(p.processBucketName, fmt.Sprintf("videos/%s/", event.EpId))
			_ = p.bucket.DeleteObject(event.Bucket, event.Key)

			failEvent := models.UploadFailedEvent{
				Key:    event.Key,
				EpId:   event.EpId,
				Bucket: event.Bucket,
				Reason: err.Error(),
			}

			p.queue.Publish(p.failProcessVideoQueueName, failEvent)
			nack(false)

			return
		}

		sucessEvent := models.UploadSuccessEvent{
			Key:    event.Key,
			EpId:   event.EpId,
			Bucket: p.processBucketName,
		}
		err := p.queue.Publish(p.processedVideoQueueName, sucessEvent)

		if err != nil {
			nack(true)
			return
		}

		ack()
		p.logger.Info("Processed video:", event.Key)
	})

	p.logger.Info("app listening queues")

	select {}
}

func (p *Processor) ProcessVideo(event models.UploadEvent) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	originalHeight, err := p.video.GetHeight(ctx, event.Bucket, event.Key)
	if err != nil {
		return fmt.Errorf("erro ao detectar resolução original: %w", err)
	}

	resolutions := helpers.FilterResolutions(originalHeight)

	errCh := make(chan error, len(resolutions))
	var wg sync.WaitGroup
	wg.Add(len(resolutions))

	for _, res := range resolutions {
		go func(res int) {
			defer wg.Done()
			if err := p.video.Process(ctx, event, res); err != nil {
				errCh <- fmt.Errorf("falha %dp: %w", res, err)
				cancel()
			}
		}(res)
	}

	go func() {
		wg.Wait()
		close(errCh)
	}()

	var finalErr error
	for err := range errCh {
		if finalErr == nil {
			finalErr = err
		}
	}

	if finalErr != nil {
		return finalErr
	}

	if err := p.UploadMasterPlaylist(event, resolutions); err != nil {
		return err
	}

	return p.bucket.DeleteObject(event.Bucket, event.Key)
}

func (p *Processor) UploadMasterPlaylist(event models.UploadEvent, resolutions []int) error {
	var master bytes.Buffer
	master.WriteString("#EXTM3U\n#EXT-X-VERSION:3\n")

	for _, res := range resolutions {
		bandwidth := 1500000
		width := 854
		switch res {
		case 720:
			bandwidth = 3000000
			width = 1280
		case 1080:
			bandwidth = 5000000
			width = 1920
		}
		master.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n%d/index.m3u8\n",
			bandwidth, width, res, res))
	}

	return p.bucket.UploadFileReader(
		p.processBucketName,
		fmt.Sprintf("videos/%s/master.m3u8", event.EpId),
		bytes.NewReader(master.Bytes()),
	)
}
