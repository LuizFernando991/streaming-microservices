package controllers

import "catalog-service/internal/services"

type WorkController struct {
	workService *services.WorkService
}

func NewWorkController(workService *services.WorkService) *WorkController {
	return &WorkController{
		workService: workService,
	}
}
