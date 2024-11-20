package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type yamlSection = map[string]any

func appendYamlPrefix(a string, b string) string {
	if a == "" {
		return b
	}
	return a + "." + b
}

// ---------------------------------------------------------------------------------------
func importYamlSection(prefix string, section yamlSection) {
	for key, value := range section {
		switch v := value.(type) {
		case yamlSection:
			importYamlSection(appendYamlPrefix(prefix, key), v)
		default:
			setConfig(appendYamlPrefix(prefix, key), fmt.Sprintf("%v", value))
		}
	}
}

// ---------------------------------------------------------------------------------------
func ImportYamlContent(content []byte) {
	var imported map[string]any

	err := yaml.Unmarshal(content, &imported)
	if err != nil {
		log.WithError(nil, err).Errorln("Error unmarshaling config.")
		return
	}

	importYamlSection("", imported)
}

// ---------------------------------------------------------------------------------------
func ImportYamlFile(path string) {
	yamlFile, err := os.ReadFile(path)
	if err != nil {
		log.WithError(nil, err).WithField("path", path).
			Errorln("Error importing config.")
		return
	}

	ImportYamlContent(yamlFile)
}
