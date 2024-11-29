// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mukunda.com/nanopaint/clock"
)

// ///////////////////////////////////////////////////////////////////////////////////////
func TestRateLimiterTiming(t *testing.T) {
	clock := clock.CreateTestClockService().(*clock.TestClockService)

	period := 50
	burst := 10
	client := "test"

	rl := CreateRateLimiter(period, burst, clock)

	// A number of `burst` requests are allowed immediately.

	for request := 0; request < burst; request++ {
		assert.Equal(t, true, rl.Allow(client))
	}

	assert.Equal(t, false, rl.Allow(client))
	// Thereafter we need to wait `period` milliseconds between subsequent requests.

	for request := 0; request < 10; request++ {
		clock.Advance(time.Millisecond * time.Duration(period))
		assert.Equal(t, true, rl.Allow(client))
		assert.Equal(t, false, rl.Allow(client))
	}

	// If we wait longer than `period` milliseconds, we can make multiple requests.
	for request := 0; request < 10; request++ {
		clock.Advance(time.Millisecond * time.Duration(period) * 2)
		assert.Equal(t, true, rl.Allow(client))
		assert.Equal(t, true, rl.Allow(client))
		assert.Equal(t, false, rl.Allow(client))
	}

	// If we wait much longer, we cannot store more than `burst` requests for use.
	clock.Advance(time.Duration(period) * 100 * time.Millisecond)

	// Only `burst` requests allowed before another block at this time point.
	for request := 0; request < burst; request++ {
		assert.Equal(t, true, rl.Allow(client))
	}

	assert.Equal(t, false, rl.Allow(client))
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestRateLimiterThreading(t *testing.T) {
	////////////////////////////////////
	// The rate limiter is thread safe.
	//
	clock := clock.CreateTestClockService().(*clock.TestClockService)
	period := 10
	burst := 5
	nthreads := 100

	rl := CreateRateLimiter(period, burst, clock)
	results := make(chan bool, nthreads*100) // x100 is arbitrary, we just want enough space.

	// Stress test to confirm mutex locking is correct.
	for fullReset := 0; fullReset < 1; fullReset++ {
		clock.Advance(time.Hour)
		testFails := 3

		{
			allows := 0
			blocks := 0
			for thread := 0; thread < nthreads; thread++ {
				go func(thread int) {
					for i := 0; i < burst+testFails; i++ {
						go func(thread int) { // Even more entropy.
							results <- rl.Allow(fmt.Sprintf("client%d", thread))
						}(thread)
					}
				}(thread)
			}
			for thread := 0; thread < nthreads; thread++ {
				for i := 0; i < burst+testFails; i++ {
					if <-results {
						allows++
					} else {
						blocks++
					}
				}
			}

			assert.Equal(t, burst*nthreads, allows)
			assert.Equal(t, testFails*nthreads, blocks)
		}

		clock.Advance(time.Hour * 24)
	}
}
