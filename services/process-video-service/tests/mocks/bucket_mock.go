package mocks

import (
	"io"

	"github.com/stretchr/testify/mock"
)

type MockBucket struct{ mock.Mock }

func (m *MockBucket) UploadFileReader(bucket, key string, body io.Reader) error {
	args := m.Called(bucket, key, body)
	return args.Error(0)
}
func (m *MockBucket) DeleteObject(bucket, key string) error {
	args := m.Called(bucket, key)
	return args.Error(0)
}
func (m *MockBucket) DeletePrefix(bucket, prefix string) error {
	args := m.Called(bucket, prefix)
	return args.Error(0)
}
func (m *MockBucket) GetObjectStream(bucket, key string) (io.ReadCloser, error) {
	args := m.Called(bucket, key)
	return args.Get(0).(io.ReadCloser), args.Error(1)
}
func (m *MockBucket) GetPartOfObjectStream(bucket, key, fileRange string) (io.ReadCloser, error) {
	args := m.Called(bucket, key, fileRange)
	return args.Get(0).(io.ReadCloser), args.Error(1)
}
