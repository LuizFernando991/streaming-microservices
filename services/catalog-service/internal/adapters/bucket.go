package adapters

import (
	"context"
	"fmt"
	"log"
	"mime"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type Bucket struct {
	client     *s3.Client
	bucketName string
}

func NewBucket(endpointURL, accessKey, secretKey, bucketName string) *Bucket {
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
	return &Bucket{
		client: s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.UsePathStyle = true
		}),
		bucketName: bucketName,
	}
}

func (b *Bucket) UploadFile(ctx context.Context, file multipart.File, filename string) (string, error) {
	uploader := manager.NewUploader(b.client)

	ext := filepath.Ext(filename)
	contentType := mime.TypeByExtension(ext)

	fileKey := uuid.New().String() + ext

	_, err := uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(b.bucketName),
		Key:         aws.String(fileKey),
		Body:        file,
		ContentType: aws.String(contentType),
		ACL:         "public-read",
	})

	if err != nil {
		return "", err
	}

	return fileKey, nil
}

func (b *Bucket) DeleteFile(ctx context.Context, key string) error {
	_, err := b.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(b.bucketName),
		Key:    aws.String(key),
	})
	return err
}

func (b *Bucket) EnsureBucketExists(bucket string) error {
	ctx := context.Background()
	_, err := b.client.CreateBucket(context.Background(), &s3.CreateBucketInput{
		Bucket: &bucket,
	})
	if err != nil {
		if strings.Contains(err.Error(), "BucketAlreadyOwnedByYou") ||
			strings.Contains(err.Error(), "BucketAlreadyExists") {
			return nil
		}
		return fmt.Errorf("erro criando bucket %s: %w", bucket, err)
	}

	policy := fmt.Sprintf(`{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": ["arn:aws:s3:::%s/*"]
            }
        ]
    }`, bucket)

	_, err = b.client.PutBucketPolicy(ctx, &s3.PutBucketPolicyInput{
		Bucket: &bucket,
		Policy: &policy,
	})
	if err != nil {
		return fmt.Errorf("erro aplicando policy pública: %w", err)
	}

	return nil
}
