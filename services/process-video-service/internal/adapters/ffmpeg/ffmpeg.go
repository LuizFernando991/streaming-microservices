package ffmpeg

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"process-video-service/internal/interfaces"
	"process-video-service/internal/models"
)

type FFMPEGProcessor struct {
	bucket              interfaces.Bucket
	processedBucketName string
	tmpDir              string
	enableGpuProcess    bool
	enableGPUScaleNPP   bool
}

func NewFFMPEGProcessor(bucket interfaces.Bucket, processedBucketName string, enableGpuProcess, enableGPUScaleNPP bool) *FFMPEGProcessor {
	return &FFMPEGProcessor{
		bucket:              bucket,
		tmpDir:              "/dev/shm",
		processedBucketName: processedBucketName,
		enableGpuProcess:    enableGpuProcess,
		enableGPUScaleNPP:   enableGPUScaleNPP,
	}
}

func (f *FFMPEGProcessor) GetHeight(ctx context.Context, bucket, key string) (int, error) {
	h, err := f.getVideoHeightPartial(bucket, key, "bytes=0-2097152")
	if err == nil {
		return h, nil
	}
	return f.getVideoHeightFull(bucket, key)
}

func (f *FFMPEGProcessor) Process(ctx context.Context, event models.UploadEvent, resolution int) error {
	if err := f.processResolution(ctx, event, resolution); err != nil {
		return err
	}
	return nil
}

func (f *FFMPEGProcessor) processResolution(ctx context.Context, event models.UploadEvent, resolution int) error {
	tmp := filepath.Join(f.tmpDir, fmt.Sprintf("%s-%dp", event.Key, resolution))
	os.MkdirAll(tmp, 0755)
	defer os.RemoveAll(tmp)

	playlistPath := filepath.Join(tmp, "index.m3u8")
	segmentPattern := filepath.Join(tmp, "seg%03d.ts")

	stream, err := f.bucket.GetObjectStream(event.Bucket, event.Key)
	if err != nil {
		return err
	}
	defer stream.Close()

	// // Direct command
	// cmd := exec.CommandContext(ctx,
	// 	"ffmpeg",
	// 	"-hwaccel", "cuda",
	// 	"-i", "pipe:0",
	// 	"-vf", "scale=-2:"+strconv.Itoa(resolution),
	// 	"-c:v", "h264_nvenc",
	// 	"-preset", "fast",
	// 	"-c:a", "aac",
	// 	"-f", "hls",
	// 	"-hls_time", "10",
	// 	"-hls_list_size", "0",
	// 	"-hls_segment_filename", segmentPattern,
	// 	playlistPath,
	// )

	args := []string{"-i", "pipe:0"}

	if f.enableGpuProcess {
		args = append(args, "-c:v", "h264_nvenc", "-preset", "fast")
		if f.enableGPUScaleNPP {
			args = append(args, "-vf", fmt.Sprintf("scale_npp=-2:%d", resolution))
		} else {
			args = append(args, "-vf", fmt.Sprintf("scale=-2:%d", resolution))
		}
	} else {
		// CPU
		args = append(args, "-c:v", "libx264", "-preset", "fast", "-vf", fmt.Sprintf("scale=-2:%d", resolution))
	}

	args = append(args,
		"-c:a", "aac",
		"-f", "hls",
		"-hls_time", "10",
		"-hls_list_size", "0",
		"-hls_segment_filename", segmentPattern,
		playlistPath,
	)

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	cmd.Stdin = stream

	if err := cmd.Start(); err != nil {
		return err
	}

	uploaded := map[string]bool{}
	s3Prefix := fmt.Sprintf("videos/%s/%dp", event.EpId, resolution)

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

loop:
	for {
		select {
		case <-ctx.Done():
			_ = cmd.Process.Kill()
			return fmt.Errorf("cancelado pelo contexto")
		case err := <-done:
			if err != nil {
				return err
			}
			break loop
		default:
			files, _ := os.ReadDir(tmp)
			for _, fl := range files {
				if uploaded[fl.Name()] {
					continue
				}
				uploaded[fl.Name()] = true

				localPath := filepath.Join(tmp, fl.Name())
				file, err := os.Open(localPath)
				if err != nil {
					continue
				}
				if err := f.bucket.UploadFileReader(f.processedBucketName, s3Prefix+"/"+fl.Name(), file); err != nil {
					file.Close()
					return err
				}
				file.Close()
				os.Remove(localPath)
			}
			time.Sleep(50 * time.Millisecond)
		}
	}

	return nil
}

func (f *FFMPEGProcessor) getVideoHeightPartial(bucket, key, byteRange string) (int, error) {
	stream, err := f.bucket.GetPartOfObjectStream(bucket, key, byteRange)
	if err != nil {
		return 0, err
	}
	defer stream.Close()
	return f.getHeightFromStream(stream)
}

func (f *FFMPEGProcessor) getVideoHeightFull(bucket, key string) (int, error) {
	stream, err := f.bucket.GetObjectStream(bucket, key)
	if err != nil {
		return 0, err
	}
	defer stream.Close()
	return f.getHeightFromStream(stream)
}

func (f *FFMPEGProcessor) getHeightFromStream(stream io.Reader) (int, error) {
	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=height",
		"-of", "csv=p=0",
		"pipe:0",
	)
	cmd.Stdin = stream
	out, err := cmd.Output()
	if err != nil {
		return 0, err
	}
	h, err := strconv.Atoi(string(bytes.TrimSpace(out)))
	if err != nil {
		return 0, err
	}
	return h, nil
}
