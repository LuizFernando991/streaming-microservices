package models

type UploadEvent struct {
	Bucket string `json:"bucket"`
	Key    string `json:"object_key"`
	EpId   string `json:"episode_id"`
}

type UploadFailedEvent struct {
	Key    string `json:"key"`
	EpId   string `json:"epId"`
	Bucket string `json:"bucket"`
	Reason string `json:"reason"`
}

type UploadSuccessEvent struct {
	EpId   string `json:"epId"`
	Key    string `json:"key"`
	Bucket string `json:"bucket"`
}
