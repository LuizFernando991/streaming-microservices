package interfaces

import (
	"catalog-service/internal/models"
)

type WorkRepository interface {
	Create(workData models.Work) (*models.Work, error)
	GetByID(id string) (*models.Work, error)
	Update(id string, workData models.Work) (*models.Work, error)
	Delete(id string) error
	RunInTransaction(fn func(txRepo WorkRepository) error) error
}
