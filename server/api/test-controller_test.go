// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"testing"
	"time"

	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core/clock"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

func TestTestController(t *testing.T) {
	var hs HttpService
	var tc *clock.TestClockService
	app := fxtest.New(t,
		config.ProvideFromYamlString(`
http:
  port: 0
  rateLimitPeriod: 50
  rateLimitBurst: 10
`),
		fx.Provide(clock.CreateTestClockService),
		Fx(),
		fx.Invoke(func(phs HttpService, cs clock.ClockService) {
			hs = phs
			tc = cs.(*clock.TestClockService)
		}),
	)
	app.RequireStart()
	defer app.RequireStop()

	testreq(t, hs).Get("/api/test").
		Expect(200, "TEST", "Test GET endpoint.")
	testreq(t, hs).Post("/api/test").
		Expect(200, "TEST", "Test POST endpoint.")
	testreq(t, hs).Put("/api/test").
		Expect(200, "TEST", "Test PUT endpoint.")
	testreq(t, hs).Delete("/api/test").
		Expect(200, "TEST", "Test DELETE endpoint.")

	/////////////////////////////////////////////////////////////////////////////////
	// Endpoints can be rate limited. The rate limit is defined in the configuration.
	// There is one rate limit configuration shared by main endpoints.
	for rep := 0; rep < 10; rep++ {
		tc.Advance(time.Hour * 24)
		for test := 0; test < 10; test++ {
			testreq(t, hs).Post("/api/test-ratelimit").Expect(200, "TEST", "Test rate limit endpoint.")
		}

		for test := 0; test < 10; test++ {
			tc.Advance(100 * time.Millisecond)
			testreq(t, hs).Post("/api/test-ratelimit").Expect(200, "TEST", "Test rate limit endpoint.")
			testreq(t, hs).Post("/api/test-ratelimit").Expect(200, "TEST", "Test rate limit endpoint.")
			testreq(t, hs).Post("/api/test-ratelimit").Expect(429, "RATE_LIMIT", "Rate limit exceeded.")
		}
	}

}
