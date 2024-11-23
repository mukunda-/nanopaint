// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"testing"

	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core"
	"go.mukunda.com/nanopaint/test"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

type testreqFactory func() *test.Request

func createPaintTester(t *testing.T) (*fxtest.App, testreqFactory) {
	var hs HttpService
	app := fxtest.New(t,
		config.ProvideFromYamlString(``),
		fx.Provide(
			core.CreateTestClockService,
			CreateHttpService,
			unwrapHttpRouter,
			annotateController(CreatePaintController),
		),
		core.Fx(),
		fx.Invoke(func(s StartControllersParam, phs HttpService) {
			hs = phs
		}),
	).RequireStart()

	return app, func() *test.Request {
		return testreq(t, hs)
	}
}

func TestPaintController(t *testing.T) {
	app, rq := createPaintTester(t)
	defer app.RequireStop()

	/////////////////////////////////////////////////////////
	// The given coordinates are validated.
	rq().Get("/api/block/a@@b").Expect(400, "BAD_REQUEST", "Invalid coordinates.")

	/////////////////////////////////////////////////////////
	// /api/block is used to request existing blocks.
	rq().Get("/api/block/").Expect(200, "BLOCK")

	/////////////////////////////////////////////////////////
	// Non-existing blocks result in a 404 response.
	rq().Get("/api/block/000").Expect(404, "NOT_FOUND", "Block not found.")

	/////////////////////////////////////////////////////////
	//rq().Post("/api/pixel/").Expect(400,
}
