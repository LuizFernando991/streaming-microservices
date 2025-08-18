package mocks

import (
	"context"
	"process-video-service/internal/models"

	"github.com/stretchr/testify/mock"
)

type MockVideo struct{ mock.Mock }

func (m *MockVideo) Process(ctx context.Context, event models.UploadEvent, resolution int) error {
	args := m.Called(ctx, event, resolution)
	return args.Error(0)
}
func (m *MockVideo) GetHeight(ctx context.Context, bucket, key string) (int, error) {
	args := m.Called(ctx, bucket, key)
	return args.Int(0), args.Error(1)
}
