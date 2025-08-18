package s3

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"mime"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3Client struct {
	client *s3.Client
}

func New(endpointURL, accessKey, secretKey string) *S3Client {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
		config.WithEndpointResolverWithOptions(
			aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:           endpointURL,
					SigningRegion: "us-east-1",
				}, nil
			}),
		),
	)
	if err != nil {
		log.Fatal("Erro carregando config AWS:", err)
	}

	return &S3Client{
		client: s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.UsePathStyle = true
		}),
	}
}

func (s *S3Client) GetObjectStream(bucket, key string) (io.ReadCloser, error) {
	resp, err := s.client.GetObject(context.Background(), &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}

func (s *S3Client) GetPartOfObjectStream(bucket, key, fileRange string) (io.ReadCloser, error) {
	resp, err := s.client.GetObject(context.Background(), &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
		Range:  aws.String(fileRange),
	})
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}

func guessContentType(key string) *string {
	ext := filepath.Ext(key)
	mt := mime.TypeByExtension(ext)
	if mt == "" {
		switch ext {
		case ".m3u8":
			mt = "application/vnd.apple.mpegurl"
		case ".ts":
			mt = "video/MP2T"
		default:
			mt = "application/octet-stream"
		}
	}
	return &mt
}

func (s *S3Client) UploadFileReader(bucket, key string, body io.Reader) error {
	buf := &bytes.Buffer{}
	if _, err := io.Copy(buf, body); err != nil {
		return fmt.Errorf("erro ao ler o reader: %w", err)
	}

	_, err := s.client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: guessContentType(key),
	})
	return err
}

func (s *S3Client) UploadStream(bucket, key string, body io.Reader) error {
	_, err := s.client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        body,
		ContentType: guessContentType(key),
	})
	return err
}

func (c *S3Client) DeleteObject(bucket, key string) error {
	_, err := c.client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})

	return err
}

func (c *S3Client) DeletePrefix(bucket, prefix string) error {
	paginator := s3.NewListObjectsV2Paginator(c.client, &s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &prefix,
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.Background())
		if err != nil {
			return err
		}
		if len(page.Contents) == 0 {
			continue
		}

		var objects []s3types.ObjectIdentifier
		for _, obj := range page.Contents {
			objects = append(objects, s3types.ObjectIdentifier{Key: obj.Key})
		}

		_, err = c.client.DeleteObjects(context.Background(), &s3.DeleteObjectsInput{
			Bucket: &bucket,
			Delete: &s3types.Delete{Objects: objects},
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *S3Client) EnsureBucketExists(bucket string) error {
	_, err := c.client.CreateBucket(context.Background(), &s3.CreateBucketInput{
		Bucket: &bucket,
	})
	if err != nil {
		if strings.Contains(err.Error(), "BucketAlreadyOwnedByYou") ||
			strings.Contains(err.Error(), "BucketAlreadyExists") {
			return nil
		}
		return fmt.Errorf("erro criando bucket %s: %w", bucket, err)
	}

	return nil
}
