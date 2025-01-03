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

// ///////////////////////////////////////////////////////////////////////////////////////
func TestTestClockThreadSafety(t *testing.T) {
	/////////////////////////////////
	// The test clock is thread safe.

	// Stress test:
	// See if advancing works as expected when advancing from 1000 threads.
	tc := CreateTestClockService().(*TestClockService)

	startTime := tc.Now()

	done := make(chan bool, 1000)

	for i := 0; i < 1000; i++ {
		go func() {
			tc.Advance(time.Second)
			done <- true
		}()
	}

	for i := 0; i < 1000; i++ {
		<-done
	}

	assert.Equal(t, startTime.Add(time.Second*1000).Unix(), tc.Now().Unix())
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestTestClockInterval(t *testing.T) {

	{
		tc := CreateTestClockService().(*TestClockService)

		{
			/////////////////////////////////////////////////
			// Intervals are triggered when time is advanced.

			total := 0
			tc.StartInterval(time.Minute, func() {
				total += 1
			})

			// Fires once
			// (0:00 -> 1:00)
			tc.Advance(time.Minute)
			assert.Equal(t, 1, total)

			// Does not advance, needs another second.
			// (1:00 -> 1:59)
			tc.Advance(time.Minute - time.Second)
			assert.Equal(t, 1, total)

			// Fires twice.
			// (1:59 -> 3:00)
			tc.Advance(time.Second + time.Minute)
			assert.Equal(t, 3, total)
		}
	}

	{
		tc := CreateTestClockService().(*TestClockService)
		{
			/////////////////////////////////////////////////////////////////////////////
			// Inside of StartInterval, Now() returns the time of the interval. It can be
			// a partial increment of the current Advance operation.
			expectedTime := tc.Now().Add(time.Second * 5)
			total := 0
			tc.StartInterval(time.Second*5, func() {
				// we're advancing 50 seconds, but expect to have Now() return the time
				// in 5 second increments like our interval.
				assert.Equal(t, expectedTime, tc.Now())
				expectedTime = expectedTime.Add(time.Second * 5)
				total++
			})

			tc.Advance(time.Second * 50)
			assert.Equal(t, 10, total)
		}
	}
}
