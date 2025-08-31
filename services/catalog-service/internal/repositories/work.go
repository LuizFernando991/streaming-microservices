package repositories

import (
	"catalog-service/internal/config"
	"catalog-service/internal/interfaces"
	"catalog-service/internal/models"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

var logger = config.GetLogger("work-repository")

type DBTX interface {
	Get(dest any, query string, args ...any) error
	Exec(query string, args ...any) (sql.Result, error)
}

type WorkRepository struct {
	execer DBTX
	db     *sqlx.DB
}

func NewWorkRepository(dbconn *sqlx.DB) interfaces.WorkRepository {
	return &WorkRepository{
		execer: dbconn,
		db:     dbconn,
	}
}

func (r *WorkRepository) WithTransaction(tx *sqlx.Tx) *WorkRepository {
	return &WorkRepository{
		execer: tx,
		db:     r.db,
	}
}

func (r *WorkRepository) Create(workData models.Work) (*models.Work, error) {
	var work models.Work
	query := `
		INSERT INTO works (tumb, title, description)
		VALUES ($1, $2, $3)
		RETURNING id, tumb, title, description, created_at, updated_at;
	`
	err := r.execer.Get(&work, query, workData.Tumb, workData.Title, workData.Description)
	if err != nil {
		logger.Error(err)
		return nil, err
	}
	return &work, nil
}

func (r *WorkRepository) GetByID(id string) (*models.Work, error) {

	if _, err := uuid.Parse(id); err != nil {
		return nil, models.ErrNotFound
	}

	var work models.Work
	query := `SELECT id, tumb, title, description, created_at, updated_at FROM works WHERE id = $1`
	err := r.execer.Get(&work, query, id)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		logger.Error(err)
		return nil, err
	}

	return &work, nil
}

func (r *WorkRepository) Update(id string, workData models.Work) (*models.Work, error) {
	var work models.Work
	query := `
		UPDATE works
		SET tumb = COALESCE($1, tumb),
		    title = COALESCE($2, title),
		    description = COALESCE($3, description),
		    updated_at = NOW()
		WHERE id = $4
		RETURNING id, tumb, title, description, created_at, updated_at;
	`
	err := r.execer.Get(&work, query, workData.Tumb, workData.Title, workData.Description, id)
	if err != nil {
		logger.Error(err)
		return nil, err
	}
	return &work, nil
}

func (r *WorkRepository) Delete(id string) error {
	query := `DELETE FROM works WHERE id = $1`
	_, err := r.execer.Exec(query, id)
	if err != nil {
		logger.Error(err)
		return err
	}
	return nil
}

func (r *WorkRepository) RunInTransaction(fn func(txRepo interfaces.WorkRepository) error) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}

	txRepo := r.WithTransaction(tx)

	defer func() {
		if p := recover(); p != nil || err != nil {
			_ = tx.Rollback()
			if p != nil {
				panic(p)
			}
		}
	}()

	err = fn(txRepo)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}
