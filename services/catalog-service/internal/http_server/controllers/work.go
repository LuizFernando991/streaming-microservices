package controllers

import (
	http_errors "catalog-service/internal/http_server/errors"
	"catalog-service/internal/models"
	"catalog-service/internal/services"
	"fmt"
	"net/http"
	"path/filepath"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
)

type WorkController struct {
	workService *services.WorkService
}

func NewWorkController(workService *services.WorkService) *WorkController {
	return &WorkController{
		workService: workService,
	}
}

// CreateWork godoc
// @Summary Creates a new work
// @Description Create a new work with title, description and image
// @Tags Works
// @Accept multipart/form-data
// @Produce json
// @Param title formData string true "Work title"
// @Param description formData string false "Work description"
// @Param image formData file true "Work thumb"
// @Success 201 {object} models.Work
// @Failure 400 {object} http_errors.ErrorResponse
// @Failure 500 {object} http_errors.ErrorResponse
// @Router /works [post]
func (wc *WorkController) CreateWork(ctx *gin.Context) {
	title := ctx.PostForm("title")

	fmt.Println(title)

	if title == "" {
		ctx.JSON(http.StatusBadRequest, http_errors.ErrorResponse{
			Status:  "bad_request",
			Message: "title is required",
		})
		return
	}

	description := ctx.PostForm("description")

	file, header, err := ctx.Request.FormFile("image")

	if err != nil || file == nil {
		ctx.JSON(http.StatusBadRequest, http_errors.ErrorResponse{
			Status:  "bad_request",
			Message: "image is required",
		})
		return
	}

	allowedExts := []string{".jpg", ".jpeg"}

	valid := slices.Contains(allowedExts, strings.ToLower(filepath.Ext(header.Filename)))

	if !valid {
		ctx.JSON(http.StatusBadRequest, http_errors.ErrorResponse{
			Status:  "bad_request",
			Message: "only JPG or JPEG images are allowed",
		})
		return
	}

	work, err := wc.workService.CreateWork(ctx, title, description, file, header)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, http_errors.ErrorResponse{
			Status:  "internal_error",
			Message: "internal error",
		})
		return
	}

	ctx.JSON(http.StatusCreated, work)
}

func (wc *WorkController) GetByID(ctx *gin.Context) {
	id := ctx.Param("id")
	if id == "" {
		ctx.JSON(http.StatusBadRequest, http_errors.ErrorResponse{
			Status:  "bad_request",
			Message: "id is required",
		})
		return
	}

	work, err := wc.workService.GetWorkById(ctx, id)
	if err != nil {
		if err == models.ErrNotFound {
			ctx.JSON(http.StatusNotFound, http_errors.ErrorResponse{
				Status:  "not_found",
				Message: "work not found",
			})
			return
		}

		ctx.JSON(http.StatusInternalServerError, http_errors.ErrorResponse{
			Status:  "internal_error",
			Message: "internal error",
		})
		return
	}

	ctx.JSON(http.StatusOK, work)
}
