// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"go.mukunda.com/nanopaint/common"
)

var log = common.GetLogger("config")

// ---------------------------------------------------------------------------------------
type Config interface {
	//
	Load(key string, result any)
	//Get(key string) string
	//Set(key string, value string)
}

type basicConfig struct {
	Keys map[string]string
}

/*
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
	setConfig("test", "test-value")
}*/
