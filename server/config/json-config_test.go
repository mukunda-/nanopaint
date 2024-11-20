// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

var testJson1 = []byte(`
{
	"test1_section": {
		"string1": "yes1",
		"string2": "true",
		"number1": 2,
		"float1": 4.0,
		"float2": 4.1,
		"bool1": true,
		"bool2": false
	},
	"test2_section": {
		"string1": "yes3",
		"string2": "false",
		"number1": 3,
		"float1": 5.0,
		"float2": 5.1,
		"bool1": true,
		"bool2": false
	}
}`)

func TestJsonConfig(t *testing.T) {
	config := CreateConfigFromJsonContent(testJson1)

	var cfg struct {
		String1 string
		String2 string
		Number1 int
		Float1  float64
		Float2  float64
		Bool1   bool
		Bool2   bool
	}

	config.Load("test1_section", &cfg)

	assert.Equal(t, "yes1", cfg.String1)
	assert.Equal(t, "true", cfg.String2)
	assert.Equal(t, 2, cfg.Number1)
	assert.Equal(t, 4.0, cfg.Float1)
	assert.Equal(t, 4.1, cfg.Float2)
	assert.Equal(t, true, cfg.Bool1)
	assert.Equal(t, false, cfg.Bool2)
}

func TestBadJsonConfig(t *testing.T) {

	config := CreateConfigFromJsonContent([]byte(`{`))

	assert.NotPanics(t, func() {
		var result struct{}
		config.Load("test", &result)
	})
}
