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
func CreateYamlConfigFromContent(content []byte) Config {
	config := yamlConfig{
		content: content,
	}
	return &config
}

// ---------------------------------------------------------------------------------------
func CreateYamlConfigFromFile(path string) Config {

	content, err := os.ReadFile(path)
	if err != nil {
		log.WithError(nil, err).WithField("path", path).
			Errorln("Error importing config file.")
		return &yamlConfig{}
	}

	return CreateYamlConfigFromContent(content)
}

// ---------------------------------------------------------------------------------------
func (yc *yamlConfig) Load(key string, result any) {
	allContent := make(map[string]interface{})
	yaml.Unmarshal(yc.content, allContent)

	section, ok := allContent[key]

	if !ok {
		log.Infoln(nil, "Config key not found:", key)
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
