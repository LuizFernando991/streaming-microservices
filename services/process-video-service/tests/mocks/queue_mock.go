package mocks

import (
	"process-video-service/internal/models"

	"github.com/stretchr/testify/mock"
)

type MockQueue struct{ mock.Mock }

func (m *MockQueue) Consume(queue string, handler func(event models.UploadEvent, ack func(), nack func(requeue bool))) {
	m.Called(queue, handler)
}
func (m *MockQueue) Close() { m.Called() }
