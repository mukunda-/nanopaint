// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "time"

type SystemClockService struct{}

func CreateSystemClockService() ClockService {
	return &SystemClockService{}
}

func (cs *SystemClockService) Now() time.Time {
	return time.Now()
}
