// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// ///////////////////////////////////////////////////////////////////////////////////////
func TestTestClockService(t *testing.T) {
	svc := CreateTestClockService()
	tcs, ok := svc.(*TestClockService)
	assert.True(t, ok)

	////////////////////////////////////////////////////////////
	// The test clock is initialized to the current system time.
	assert.LessOrEqual(t, svc.Now().Unix(), time.Now().Unix())
	assert.GreaterOrEqual(t, svc.Now().Unix(), time.Now().Unix()-1)

	/////////////////////////////////////////
	// Test time does not advance on its own.
	beforeSleep := svc.Now()
	time.Sleep(time.Millisecond * 50)
	afterSleep := svc.Now()
	assert.Equal(t, beforeSleep, afterSleep)

	//////////////////////////////////////////////////////////////////
	// Advancing the clock adjusts the time by the specified duration.
	tcs.Advance(time.Second * 50)
	assert.Equal(t, afterSleep.Unix()+50, svc.Now().Unix())

	////////////////////////////////////////////////////
	// The clock can be changed.
	testTime, _ := time.Parse("2006-01-02 15:04:05", "2024-01-01 12:00:00")
	tcs.SetTime(testTime)
	assert.EqualValues(t, 1704110400, svc.Now().Unix())
}
