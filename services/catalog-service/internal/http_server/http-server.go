package http_server

import (
	"catalog-service/internal/config"
	"catalog-service/internal/http_server/router"
	"fmt"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine      *gin.Engine
	cfg         *config.Config
	logger      *config.Logger
	controllers *router.Controllers
}

func NewServer(cfg *config.Config, controllers *router.Controllers, logger *config.Logger) *Server {
	if cfg.ENV == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	g := gin.New()
	g.Use(gin.Recovery())
	g.Use(gin.Logger())

	server := &Server{
		engine:      g,
		logger:      logger,
		cfg:         cfg,
		controllers: controllers,
	}

	r := router.NewRouter(server.engine, controllers)

	r.InitRoutes()

	return server
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%s", s.cfg.Port)
	return s.engine.Run(addr)
}
