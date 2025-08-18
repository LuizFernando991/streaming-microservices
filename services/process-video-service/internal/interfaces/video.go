package interfaces

import (
	"context"
	"process-video-service/internal/models"
)

type VideoProcessor interface {
	Process(ctx context.Context, event models.UploadEvent, resolution int) error
	GetHeight(ctx context.Context, bucket, key string) (int, error)
}
