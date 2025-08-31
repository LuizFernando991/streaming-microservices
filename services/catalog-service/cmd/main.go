package main

import (
	"catalog-service/internal/adapters"
	"catalog-service/internal/config"
	"catalog-service/internal/http_server"
	"catalog-service/internal/http_server/controllers"
	"catalog-service/internal/http_server/router"
	"catalog-service/internal/repositories"
	"catalog-service/internal/services"
	"time"

	_ "catalog-service/internal/http_server/docs"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// @title           Catalog Service API
// @version         1.0
// @description     API catalog-service
// @BasePath        /v1
func main() {
	cfg, err := config.LoadEnv(".env")

	if err != nil {
		panic(err)
	}

	logger := config.NewLogger("server")

	db, err := sqlx.Connect("postgres", cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to db", err)
	}
	db.SetConnMaxLifetime(time.Minute * 5)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	bucketAdapter := adapters.NewBucket(cfg.BucketURL, cfg.BucketKey, cfg.BucketSecret, cfg.BucketTumbName)
	workRepository := repositories.NewWorkRepository(db)
	workService := services.NewWorkService(workRepository, bucketAdapter)
	workController := controllers.NewWorkController(workService)

	bucketAdapter.EnsureBucketExists(cfg.BucketTumbName)

	controllers := &router.Controllers{
		WorkController: workController,
	}

	app := http_server.NewServer(cfg, controllers, logger)

	if err := app.Run(); err != nil {
		logger.Error("server exited", err)
	}
}
