package interfaces

import "io"

type Bucket interface {
	UploadFileReader(bucket, key string, body io.Reader) error
	DeleteObject(bucket, key string) error
	DeletePrefix(bucket, prefix string) error
	GetObjectStream(bucket, key string) (io.ReadCloser, error)
	GetPartOfObjectStream(bucket, key, fileRange string) (io.ReadCloser, error)
}
