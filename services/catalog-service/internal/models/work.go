package models

import (
	"time"
)

type Work struct {
	ID          string    `db:"id" json:"id"`
	Tumb        string    `db:"tumb" json:"tumb"`
	Title       string    `db:"title" json:"title"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}
