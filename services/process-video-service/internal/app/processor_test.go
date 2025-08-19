package app_test

import (
	"bytes"
	"errors"
	"io"
	"testing"

	"process-video-service/internal/app"
	"process-video-service/internal/config"
	"process-video-service/internal/models"

	mocks "process-video-service/tests/mocks"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var configMock = &config.Config{
	UploadVideoQueue:      "upload_completed",
	ProcessedVideoQueue:   "processed_videos",
	FailProcessVideoQueue: "failed_videos",
	BucketProcessedName:   "test-bucket-2",
}

func TestProcessVideo_Success(t *testing.T) {
	mockBucket := new(mocks.MockBucket)
	mockVideo := new(mocks.MockVideo)

	event := models.UploadEvent{
		Key:    "video.mp4",
		EpId:   "ep123",
		Bucket: "test-bucket",
	}

	mockVideo.On("GetHeight", mock.Anything, "test-bucket", "video.mp4").
		Return(1080, nil)

	mockVideo.On("Process", mock.Anything, event, mock.AnythingOfType("int")).
		Return(nil)

	mockBucket.On("UploadFileReader", "test-bucket-2", "videos/ep123/master.m3u8", mock.Anything).
		Return(nil)

	mockBucket.On("DeleteObject", "test-bucket", "video.mp4").
		Return(nil)

	processor := app.NewProcessor(configMock, nil, mockBucket, mockVideo, configMock.BucketProcessedName)

	err := processor.ProcessVideo(event)
	assert.NoError(t, err)

	mockVideo.AssertExpectations(t)
	mockBucket.AssertExpectations(t)
}

func TestProcessVideo_ErrorOnGetHeight(t *testing.T) {
	mockBucket := new(mocks.MockBucket)
	mockVideo := new(mocks.MockVideo)

	event := models.UploadEvent{
		Key:    "video.mp4",
		EpId:   "ep123",
		Bucket: "test-bucket",
	}

	mockVideo.On("GetHeight", mock.Anything, "test-bucket", "video.mp4").
		Return(0, errors.New("ffprobe failed"))

	processor := app.NewProcessor(configMock, nil, mockBucket, mockVideo, configMock.BucketProcessedName)

	err := processor.ProcessVideo(event)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ffprobe failed")
}

func TestProcessVideo_ErrorOnProcessResolution(t *testing.T) {
	mockBucket := new(mocks.MockBucket)
	mockVideo := new(mocks.MockVideo)

	event := models.UploadEvent{
		Key:    "video.mp4",
		EpId:   "ep123",
		Bucket: "test-bucket",
	}

	mockVideo.On("GetHeight", mock.Anything, "test-bucket", "video.mp4").
		Return(720, nil)

	mockVideo.On("Process", mock.Anything, event, mock.AnythingOfType("int")).
		Return(errors.New("encoder crash"))

	processor := app.NewProcessor(configMock, nil, mockBucket, mockVideo, configMock.BucketProcessedName)

	err := processor.ProcessVideo(event)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "encoder crash")
}

func TestUploadMasterPlaylist(t *testing.T) {
	mockBucket := new(mocks.MockBucket)
	mockVideo := new(mocks.MockVideo)

	event := models.UploadEvent{
		Key:    "video.mp4",
		EpId:   "ep123",
		Bucket: "test-bucket",
	}
	resolutions := []int{720, 1080}

	mockBucket.On("UploadFileReader", "test-bucket-2", "videos/ep123/master.m3u8", mock.Anything).
		Run(func(args mock.Arguments) {
			body := args.Get(2).(io.Reader)
			buf := new(bytes.Buffer)
			_, _ = buf.ReadFrom(body)
			content := buf.String()
			assert.Contains(t, content, "720/index.m3u8")
			assert.Contains(t, content, "1080/index.m3u8")
		}).Return(nil)

	processor := app.NewProcessor(configMock, nil, mockBucket, mockVideo, configMock.BucketProcessedName)
	err := processor.UploadMasterPlaylist(event, resolutions)

	assert.NoError(t, err)
	mockBucket.AssertExpectations(t)
}
