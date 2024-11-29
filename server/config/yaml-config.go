// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"encoding/json"
	"os"

	"gopkg.in/yaml.v3"
)

type yamlConfig struct {
	content []byte
}

// ---------------------------------------------------------------------------------------
func CreateConfigFromYamlContent(content []byte) Config {
	config := yamlConfig{
		content: content,
	}

	// Ignore the content if it's not valid.
	var result struct{}
	err := yaml.Unmarshal(content, &result)
	if err != nil {
		log.WithError(nil, err).Errorln("Error reading config file.")
		config.content = []byte("{}")
	}

	return &config
}

// ---------------------------------------------------------------------------------------
func CreateConfigFromYamlFile(path string) Config {

	content, err := os.ReadFile(path)
	if err != nil {
		log.WithError(nil, err).WithField("path", path).
			Errorln("Error importing config file.")
		return &yamlConfig{}
	}

	return CreateConfigFromYamlContent(content)
}

// ---------------------------------------------------------------------------------------
func (yc *yamlConfig) Load(key string, result any) {
	allContent := make(map[string]interface{})
	err := yaml.Unmarshal(yc.content, &allContent)

	if err != nil {
		// Invalid configuration is not allowed (we catch bad YAML during creation).
		panic("unexpected error reading config: " + err.Error())
	}

	section, ok := allContent[key]

	if !ok {
		log.Infoln(nil, "Config key not set:", key)
		return
	}

	bytes, err := json.Marshal(section)
	if err != nil {
		log.WithError(nil, err).Errorln("Error copying config.")
		return
	}

	err = json.Unmarshal(bytes, result)
	if err != nil {
		log.WithError(nil, err).Errorln("Error copying config (2).")
		return
	}
}
