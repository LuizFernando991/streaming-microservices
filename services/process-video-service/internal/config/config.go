package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	RabbitMQUrl           string `mapstructure:"RABBITMQ_URL"`
	ProcessedVideoQueue   string `mapstructure:"PROCESSED_VIDEO_QUEUE_NAME"`
	UploadVideoQueue      string `mapstructure:"UPLOAD_QUEUE_NAME"`
	FailProcessVideoQueue string `mapstructure:"FAILED_PROCESSED_VIDEO_QUEUE_NAME"`
	BucketURL             string `mapstructure:"BUCKET_URL"`
	BucketKey             string `mapstructure:"BUCKET_ACCESS_KEY"`
	BucketSecret          string `mapstructure:"BUCKET_ACCESS_PASSWORD"`
	BucketRawName         string `mapstructure:"BUCKET_RAW_NAME"`
	BucketProcessedName   string `mapstructure:"BUCKET_PROCESSED_NAME"`
	EnableGPUProcess      bool   `mapstructure:"ENABLE_GPU_PROCESS"`
	EnableGPUScaleNPP     bool   `mapstructure:"ENABLE_GPU_SCALE_NPP"`
	Port                  string `mapstructure:"PORT"`
}

func LoadEnv(path string) (*Config, error) {
	viper.SetConfigFile(path)
	viper.SetConfigType("env")

	viper.AutomaticEnv()

	viper.SetDefault("ENABLE_GPU_PROCESS", false)
	viper.SetDefault("ENABLE_GPU_SCALE_NPP", false)

	if err := viper.ReadInConfig(); err != nil {
		fmt.Println(".env not found, using sistem enviroment")
	}

	viper.BindEnv("RABBITMQ_URL")
	viper.BindEnv("PROCESSED_VIDEO_QUEUE_NAME")
	viper.BindEnv("UPLOAD_QUEUE_NAME")
	viper.BindEnv("FAILED_PROCESSED_VIDEO_QUEUE_NAME")
	viper.BindEnv("BUCKET_URL")
	viper.BindEnv("BUCKET_ACCESS_KEY")
	viper.BindEnv("BUCKET_ACCESS_PASSWORD")
	viper.BindEnv("BUCKET_RAW_NAME")
	viper.BindEnv("BUCKET_PROCESSED_NAME")
	viper.BindEnv("ENABLE_GPU_PROCESS")
	viper.BindEnv("ENABLE_GPU_SCALE_NPP")
	viper.BindEnv("PORT")

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
