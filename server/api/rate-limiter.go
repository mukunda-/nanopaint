// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"sync"

	"go.mukunda.com/nanopaint/core/clock"
)

// This is a lightweight rate limit for high traffic performance. The main caveat is that
// it does not have per-route configuration. All routes share the same rate limit and will
// use each others' quota, if they are using the same rate limiter instance.
//
// Rate limit is defined by `burst`, which is the number of requests allowed at once and
// `period` which is the time it takes to perform another request. Clients can accumulate
// up to `burst` requests at a time, and they get one more every `period`.

// Drop all records every hour.
const RATE_LIMITER_RESET_PERIOD = 60 * 10 * 1000

type unixMillis = int64

// ---------------------------------------------------------------------------------------
type RateLimiter interface {
	Allow(ip string) bool
}

// ---------------------------------------------------------------------------------------
type rateLimiter struct {
	nextRequestTime map[string]unixMillis
	millisPeriod    int // one request allowed per this many milliseconds
	burst           int // number of requests that can be "stocked up" if not used
	clock           clock.ClockService
	mutex           sync.Mutex

	// Reset all entries periodically to reduce waste from inactive clients
	nextResetTime unixMillis
}

// ---------------------------------------------------------------------------------------
func CreateRateLimiter(millisPeriod int, burst int, clock clock.ClockService) RateLimiter {
	return &rateLimiter{
		nextRequestTime: make(map[string]unixMillis),
		millisPeriod:    millisPeriod,
		burst:           burst,
		clock:           clock,
		nextResetTime:   clock.Now().UnixMilli() + RATE_LIMITER_RESET_PERIOD,
	}
}

// ---------------------------------------------------------------------------------------
func (r *rateLimiter) ChangeTiming(millisPeriod int, burst int) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.millisPeriod = millisPeriod
	r.burst = burst
	r.reset()
}

// ---------------------------------------------------------------------------------------
func (r *rateLimiter) Allow(client string) bool {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	now := r.clock.Now().UnixMilli()
	if now >= r.nextResetTime {
		r.reset()
	}

	nextTime, ok := r.nextRequestTime[client]
	backlogTimeLimit := now - int64(r.millisPeriod)*int64(r.burst-1)
	if !ok || nextTime < backlogTimeLimit {
		nextTime = backlogTimeLimit
	}

	if now < nextTime {
		return false
	}

	r.nextRequestTime[client] = nextTime + int64(r.millisPeriod)
	return true
}

// ---------------------------------------------------------------------------------------
func (r *rateLimiter) assertLocked() {
	// assertion that the mutex is already locked.
	if r.mutex.TryLock() {
		r.mutex.Unlock()
		panic("mutex was expected to be locked")
	}
}

// ---------------------------------------------------------------------------------------
func (r *rateLimiter) reset() {
	r.assertLocked()
	r.nextRequestTime = make(map[string]unixMillis)
	r.nextResetTime = r.clock.Now().UnixMilli() + RATE_LIMITER_RESET_PERIOD
}
