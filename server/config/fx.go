package config

import (
	"go.uber.org/fx"
)

func ProvideFromYamlString(content string) fx.Option {
	return fx.Provide(func() Config {
		return CreateConfigFromYamlContent([]byte(content))
	})
}

func ProvideFromYamlFile(path string) fx.Option {
	return fx.Provide(func() Config {
		return CreateConfigFromYamlFile(path)
	})
}

func ProvideFromJsonString(content string) fx.Option {
	return fx.Provide(func() Config {
		return CreateConfigFromJsonContent([]byte(content))
	})
}

func ProvideFromJsonFile(path string) fx.Option {
	return fx.Provide(func() Config {
		return CreateConfigFromJsonFile(path)
	})
}
