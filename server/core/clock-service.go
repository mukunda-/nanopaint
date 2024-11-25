// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "time"

type (
	IntervalCallback func()

	ClockService interface {
		Now() time.Time
		StartInterval(time.Duration, IntervalCallback)
	}
)
