package config

import (
	"go.uber.org/fx"
)

func ProvideFromYamlString(content string) fx.Option {
	return fx.Provide(func() Config {
		return CreateYamlConfigFromContent([]byte(content))
	})
}

func ProvideFromYamlFile(path string) fx.Option {
	return fx.Provide(func() Config {
		return CreateYamlConfigFromFile(path)
	})
}
