package interfaces

import "process-video-service/internal/models"

type Queue interface {
	Consume(queue string, handler func(event models.UploadEvent, ack func(), nack func(requeue bool)))
	Publish(queue string, event any) error
	Close()
}
