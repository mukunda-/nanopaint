// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"encoding/json"
	"os"
)

type jsonConfig struct {
	content []byte
}

// ---------------------------------------------------------------------------------------
func CreateConfigFromJsonContent(content []byte) Config {
	var result any
	err := json.Unmarshal(content, &result)
	if err != nil {
		log.WithError(nil, err).Errorln("Error reading config file.")
		return &jsonConfig{
			content: []byte("{}"),
		}
	}

	config := jsonConfig{
		content: content,
	}
	return &config
}

// ---------------------------------------------------------------------------------------
func CreateConfigFromJsonFile(path string) Config {

	content, err := os.ReadFile(path)
	if err != nil {
		log.WithError(nil, err).WithField("path", path).
			Errorln("Error importing config file.")
		return &yamlConfig{}
	}

	return CreateConfigFromJsonContent(content)
}

// ---------------------------------------------------------------------------------------
func (yc *jsonConfig) Load(key string, result any) {
	allContent := make(map[string]interface{})
	err := json.Unmarshal(yc.content, &allContent)

	if err != nil {
		// Invalid configuration is not allowed (we catch bad JSON during creation).
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
