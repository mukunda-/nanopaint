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
type TestClockService struct {
	mutex   sync.Mutex
	NowTime time.Time
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
func (cs *TestClockService) Advance(d time.Duration) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	cs.NowTime = cs.NowTime.Add(d)
}
