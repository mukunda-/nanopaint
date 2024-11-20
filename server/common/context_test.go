// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestContext(t *testing.T) {

	//////////////////////////////////////
	// Default value is the nil interface.
	ct := CreateBasicContext()
	assert.Nil(t, ct.Get("Hello"))

	ct.Set("Hello", "World")
	assert.Equal(t, "World", ct.Get("Hello"))

	///////////////////////////////////
	// Context keys are case-sensitive.
	assert.Nil(t, ct.Get("hello"))
}
