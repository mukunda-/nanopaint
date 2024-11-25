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

// ///////////////////////////////////////////////////////////////////////////////////////
func createBlockControllerTester(t *testing.T) (*fxtest.App, testreqFactory, *core.TestClockService) {
	var hs HttpService
	var tc *core.TestClockService
	app := fxtest.New(t,
		config.ProvideFromYamlString(``),
		fx.Provide(
			core.CreateTestClockService,
			CreateHttpService,
			unwrapHttpRouter,
			annotateController(CreatePaintController),
		),
		core.Fx(),
		fx.Invoke(func(s StartControllersParam, phs HttpService, cs core.ClockService) {
			hs = phs
			tc = cs.(*core.TestClockService)
		}),
	).RequireStart()

	return app, func() *test.Request {
		return testreq(t, hs)
	}, tc
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestBlockController_GetBlock(t *testing.T) {
	app, rq, _ := createBlockControllerTester(t)
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

}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestBlockController_SetBlock(t *testing.T) {
	app, rq, tc := createBlockControllerTester(t)
	defer app.RequireStop()

	type blockSetInput struct {
		Color string `json:"color"`
	}
	goodColorPayload := blockSetInput{
		Color: "FF0000",
	}

	/////////////////////////////////////////////////////////////////////
	// The coordinates are validated.
	// A 400 response is returned from invalid formatting.
	rq().Post("/api/block/a@@b").Send(goodColorPayload).
		Expect(400, "BAD_REQUEST", "Invalid coordinate string.")

	/////////////////////////////////////////////////////////////
	// A 404 is returned when a block does not have a parent yet.
	rq().Post("/api/block/0000").Send(goodColorPayload).
		Expect(404, "NOT_FOUND", "Block not found.")

	/////////////////////////////////////////////////////////
	// The "color" field is required.
	rq().Post("/api/block/0000").Expect(400, "BAD_REQUEST", "`body.color` is missing.")

	///////////////////////////////////////////////////////////
	// The "color" field is validated, rejecting invalid input.
	invalidColors := []string{
		"FF000", "FF0000FF", "abcdefg", "g", "a", "ab", "1", "12", "123", "1234", "12345", "12345 6", "😃", " ",
	}
	for _, color := range invalidColors {
		rq().Post("/api/block/0").Send(blockSetInput{
			Color: color,
		}).Expect(400, "BAD_REQUEST", "Invalid color. Must be in the format RRGGBB.")
	}

	//////////////////////////////////////////////////////////////////////////////////
	// Blocks can be set and then updated within a certain time period until they dry.
	rq().Post("/api/block/0").Send(blockSetInput{
		Color: "ff0000",
	}).Expect(200, "BLOCK_SET")

	rq().Post("/api/block/0").Send(blockSetInput{
		Color: "ffff00",
	}).Expect(200, "BLOCK_SET")

	////////////////////////////////////////////////////////////////////////////////
	// A 404 is returned when a block parent is not dry yet. Same as when the parent
	// doesn't exist.
	rq().Post("/api/block/00").Send(goodColorPayload).
		Expect(404, "NOT_FOUND", "Block not found.")

	tc.Advance(15)
	rq().Post("/api/block/00").Send(goodColorPayload).
		Expect(200, "BLOCK_SET")
}
