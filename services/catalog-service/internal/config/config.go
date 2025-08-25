package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Port        string `mapstructure:"PORT"`
	ENV         string `mapstructure:"ENV"`
	DatabaseURL string `mapstructure:"DATABASE_URL"`
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

	viper.SetDefault("ENV", "development")

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
