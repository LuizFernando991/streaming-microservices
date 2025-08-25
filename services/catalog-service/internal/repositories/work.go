package repositories

import (
	"catalog-service/internal/interfaces"

	"github.com/jmoiron/sqlx"
)

// var logger = config.GetLogger("work-repository")

type WorkRepository struct {
	db *sqlx.DB
}

func NewWorkRepository(dbconn *sqlx.DB) interfaces.WorkRepository {
	return &WorkRepository{
		db: dbconn,
	}
}
