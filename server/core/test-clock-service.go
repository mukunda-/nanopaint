// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "time"

// ---------------------------------------------------------------------------------------
type TestClockService struct {
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
	return cs.NowTime
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) SetTime(t time.Time) {
	cs.NowTime = t
}

// ---------------------------------------------------------------------------------------
func (cs *TestClockService) Advance(d time.Duration) {
	cs.NowTime = cs.NowTime.Add(d)
}
