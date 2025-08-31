package http_errors

type ErrorResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
