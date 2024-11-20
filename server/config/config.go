// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
// Application-wide config from environment.
package config

import (
	"strings"

	"go.mukunda.com/nanopaint/common"
)

var log = common.GetLogger("config")

// ---------------------------------------------------------------------------------------
type Config struct {
	Keys map[string]string
}

var config Config

// ---------------------------------------------------------------------------------------
func Get(key string) string {
	return config.Keys[key]
}

// ---------------------------------------------------------------------------------------
func setConfig(key string, value string) {
	if !strings.Contains(key, "secret") {
		log.Debugln(nil, "Setting config value", key, "=", value)
	} else {
		log.Debugln(nil, "Setting config secret", key)
	}
	config.Keys[key] = value
}

// ---------------------------------------------------------------------------------------
func init() {
	config.Keys = make(map[string]string)
	setConfig("test", "test-value")
}
