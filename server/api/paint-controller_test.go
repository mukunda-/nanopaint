// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"testing"

	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

func TestPaintController(t *testing.T) {
	var hs HttpService
	app := fxtest.New(t,
		config.ProvideFromYamlString(``),
		fx.Provide(
			core.CreateTestClockService,
			CreateHttpService,
			unwrapHttpRouter,
			annotateController(CreatePaintController),
		),
		fx.Invoke(func(s StartControllersParam, phs HttpService) {
			hs = phs
		}),
	).RequireStart()
	defer app.RequireStop()

	testreq(t, hs).Get("/api/block/a@@b").Expect(400, "BAD_REQUEST", "Invalid coordinates.")
}
