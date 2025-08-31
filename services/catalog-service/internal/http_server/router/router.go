package router

import (
	"catalog-service/internal/http_server/controllers"

	"github.com/gin-gonic/gin"
)

type Controllers struct {
	WorkController *controllers.WorkController
}

type Router struct {
	server      *gin.Engine
	controllers *Controllers
}

func NewRouter(server *gin.Engine, controllers *Controllers) *Router {
	return &Router{
		server:      server,
		controllers: controllers,
	}
}

func (r *Router) InitRoutes() {
	v1Group := r.server.Group("/v1")

	// Work group
	worksGroup := v1Group.Group("/work")
	{
		worksGroup.POST("/create", r.controllers.WorkController.CreateWork)
	}
}
