// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"testing"

	"go.mukunda.com/nanopaint/config"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

func TestTestController(t *testing.T) {
	var hs HttpService
	app := fxtest.New(t,
		config.ProvideFromYamlString(""),
		Fx(),
		fx.Invoke(func(phs HttpService) {
			hs = phs
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
}
