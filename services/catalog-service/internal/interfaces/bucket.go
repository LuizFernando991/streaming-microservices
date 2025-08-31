package interfaces

import (
	"context"
	"mime/multipart"
)

type Bucket interface {
	UploadFile(ctx context.Context, file multipart.File, filename string) (string, error)
	DeleteFile(ctx context.Context, filename string) error
}
