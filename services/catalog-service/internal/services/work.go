package services

import "catalog-service/internal/interfaces"

type WorkService struct {
	workRepository interfaces.WorkRepository
}

func NewWorkService(workRepository interfaces.WorkRepository) *WorkService {
	return &WorkService{
		workRepository: workRepository,
	}
}
