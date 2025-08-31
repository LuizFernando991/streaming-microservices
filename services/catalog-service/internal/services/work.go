package services

import (
	"catalog-service/internal/interfaces"
	"catalog-service/internal/models"
	"context"
	"mime/multipart"
)

type WorkService struct {
	workRepository interfaces.WorkRepository
	bucket         interfaces.Bucket
}

func NewWorkService(workRepository interfaces.WorkRepository, bucket interfaces.Bucket) *WorkService {
	return &WorkService{
		workRepository: workRepository,
		bucket:         bucket,
	}
}

func (ws *WorkService) CreateWork(ctx context.Context, title, description string, file multipart.File, header *multipart.FileHeader) (*models.Work, error) {
	defer file.Close()

	var createdWork *models.Work

	err := ws.workRepository.RunInTransaction(func(txRepo interfaces.WorkRepository) error {

		imageURL, err := ws.bucket.UploadFile(ctx, file, header.Filename)

		if err != nil {
			return err
		}

		newWork := models.Work{
			Title:       title,
			Description: description,
			Tumb:        imageURL,
		}

		work, err := txRepo.Create(newWork)

		if err != nil {
			return err
		}

		createdWork = work

		//send to elastic

		return nil
	})

	if err != nil {
		return nil, err
	}

	return createdWork, nil
}
