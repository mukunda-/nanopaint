// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package clock

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// ///////////////////////////////////////////////////////////////////////////////////////
func TestSystemClock(t *testing.T) {
	// The system clock follows system time and advances automatically.
	//
	before := time.Now()
	time.Sleep(time.Millisecond * 1)
	cs := CreateSystemClockService()
	assert.Greater(t, cs.Now().UnixMilli(), before.UnixMilli())
}
