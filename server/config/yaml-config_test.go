// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

var testYaml1 = []byte(`
test1_section:
   string1: yes1
   string2: "true"
   number1: 2
   float1: 4.0
   float2: 4.1
   bool1: true
   bool2: false
test2_section:
   string1: yes3
   string2: "false"
   number1: 3
   float1: 5.0
   float2: 5.1
   bool1: true
   bool2: false
`)

func TestYamlConfig(t *testing.T) {
	config := CreateConfigFromYamlContent(testYaml1)

	var cfg struct {
		String1 string
		String2 string
		Number1 int
		Float1  float64
		Float2  float64
		Bool1   bool
		Bool2   bool
	}

	// Config.Load transfers a section of the config into the provided struct.
	//
	// For our implemenation, the types must match the types in the YAML file. I don't like
	// this approach since it could cause some user confusion. E.g., "true" is a boolean,
	// not a string, and if the struct accepts a string, it would be ignored. Ideally it
	// would coerce to the struct field type and not ignore it.

	config.Load("test1_section", &cfg)

	assert.Equal(t, "yes1", cfg.String1)
	assert.Equal(t, "true", cfg.String2)
	assert.Equal(t, 2, cfg.Number1)
	assert.Equal(t, 4.0, cfg.Float1)
	assert.Equal(t, 4.1, cfg.Float2)
	assert.Equal(t, true, cfg.Bool1)
	assert.Equal(t, false, cfg.Bool2)
}

func TestInvalidYaml(t *testing.T) {

	config := CreateConfigFromYamlContent([]byte(`{{{{{{`))

	assert.NotPanics(t, func() {
		var result struct{}
		config.Load("test1_section", &result)
	})
}
