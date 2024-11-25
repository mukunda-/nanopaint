// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"sync"
	"time"
)

// ---------------------------------------------------------------------------------------
type testClockInterval struct {
	duration time.Duration
	nextTime time.Time
	callback IntervalCallback
}

// ---------------------------------------------------------------------------------------
type TestClockService struct {
	mutex     sync.Mutex
	NowTime   time.Time
	intervals []*testClockInterval
}

// ---------------------------------------------------------------------------------------
func CreateTestClockService() ClockService {
	return &TestClockService{
		NowTime: time.Now(),
	}
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) Now() time.Time {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	return cs.NowTime
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) SetTime(t time.Time) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	cs.NowTime = t
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) getClosestIntervalWithin(d time.Duration) *testClockInterval {
	var bestInterval *testClockInterval = nil

	limit := cs.NowTime.Add(d)
	for i := 0; i < len(cs.intervals); i++ {
		if !cs.intervals[i].nextTime.After(limit) {
			if bestInterval == nil || cs.intervals[i].nextTime.Before(bestInterval.nextTime) {
				bestInterval = cs.intervals[i]
			}
		}
	}

	return bestInterval
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) Advance(duration time.Duration) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	closestInterval := cs.getClosestIntervalWithin(duration)
	if closestInterval != nil {
		advanced := closestInterval.nextTime.Sub(cs.NowTime)
		duration = duration - advanced
		cs.NowTime = cs.NowTime.Add(advanced)
		closestInterval.nextTime = closestInterval.nextTime.Add(closestInterval.duration)

		cs.mutex.Unlock()
		defer cs.mutex.Lock() // the mutex MUST be locked for the defer Unlock (stupid)

		closestInterval.callback()
		cs.Advance(duration) // does go have tail-call optimization?
	} else {
		cs.NowTime = cs.NowTime.Add(duration)
		return
	}
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) StartInterval(duration time.Duration, callback IntervalCallback) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	cs.intervals = append(cs.intervals, &testClockInterval{
		duration: duration,
		nextTime: cs.NowTime.Add(duration),
		callback: callback,
	})
}
