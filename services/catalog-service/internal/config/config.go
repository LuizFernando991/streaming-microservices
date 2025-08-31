package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Port           string `mapstructure:"PORT"`
	ENV            string `mapstructure:"ENV"`
	DatabaseURL    string `mapstructure:"DATABASE_URL"`
	BucketURL      string `mapstructure:"BUCKET_URL"`
	BucketKey      string `mapstructure:"BUCKET_ACCESS_KEY"`
	BucketSecret   string `mapstructure:"BUCKET_ACCESS_PASSWORD"`
	BucketTumbName string `mapstructure:"BUCKET_TUMB_NAME"`
}

func LoadEnv(path string) (*Config, error) {
	viper.SetConfigFile(path)
	viper.SetConfigType("env")

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		fmt.Println(".env not found, using sistem enviroment")
	}

	viper.BindEnv("PORT")
	viper.BindEnv("ENV")
	viper.BindEnv("DATABASE_URL")
	viper.BindEnv("BUCKET_URL")
	viper.BindEnv("BUCKET_ACCESS_KEY")
	viper.BindEnv("BUCKET_ACCESS_PASSWORD")
	viper.BindEnv("BUCKET_TUMB_NAME")

	viper.SetDefault("ENV", "development")

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
