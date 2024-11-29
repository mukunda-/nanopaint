// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core"
	"go.mukunda.com/nanopaint/core/block2"
	"go.mukunda.com/nanopaint/core/clock"
	"go.mukunda.com/nanopaint/test"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

type testreqFactory func() *test.Request

// ///////////////////////////////////////////////////////////////////////////////////////
func createPaintControllerTester(t *testing.T, options string) (*fxtest.App, testreqFactory, *clock.TestClockService) {
	var hs HttpService
	var tc *clock.TestClockService

	configFields := map[string]any{}

	if strings.Contains(options, "noratelimit") {
		configFields["http"] = struct {
			DisableRateLimit bool
		}{true}
	}

	configString, _ := json.Marshal(configFields)

	app := fxtest.New(t,
		config.ProvideFromJsonString(string(configString)),
		fx.Provide(
			clock.CreateTestClockService,
			CreateHttpService,
			unwrapHttpRouter,
			annotateController(CreatePaintController),
		),
		core.Fx(),
		fx.Invoke(func(s StartControllersParam, phs HttpService, cs clock.ClockService) {
			hs = phs
			tc = cs.(*clock.TestClockService)
		}),
	).RequireStart()

	return app, func() *test.Request {
		return testreq(t, hs)
	}, tc
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestBlockController_GetBlock(t *testing.T) {
	app, rq, _ := createPaintControllerTester(t, "noratelimit")
	defer app.RequireStop()

	/////////////////////////////////////////////////////////
	// The given coordinates are validated.
	rq().Get("/api/block/a@@b").Expect(400, "BAD_REQUEST", "invalid coords")

	/////////////////////////////////////////////////////////
	// /api/block is used to request existing blocks.

	rq().Post("/api/paint/"+urlCoords("010101,010101")).Send(paintInput{
		Color: "f00",
	}).Expect(200, "PIXEL_SET")
	rq().Get("/api/block/Aw==").Expect(200, "BLOCK")

	/////////////////////////////////////////////////////////
	// Non-existing blocks result in a 404 response.
	rq().Get("/api/block/"+urlCoords("1,1")).Expect(404, "NOT_FOUND", "Block not found.")

}

func coordsFromBits(x, y string) block2.Coords {
	x = strings.ReplaceAll(x, " ", "")
	y = strings.ReplaceAll(y, " ", "")
	if len(x) != len(y) {
		panic("unequal coords components")
	}
	coords := block2.MakeEmptyCoords()
	for i := 0; i < len(x); i++ {
		bx := x[i] - '0'
		by := y[i] - '0'
		coords = coords.Down(bx, by)
	}
	return coords
}

func urlCoords(xy string) string {
	parts := strings.Split(xy, ",")
	return coordsFromBits(parts[0], parts[1]).ToBase64()
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestPaintController_Paint(t *testing.T) {
	app, rq, tc := createPaintControllerTester(t, "noratelimit")
	defer app.RequireStop()

	goodColorPayload := paintInput{
		Color: "F00",
	}

	/////////////////////////////////////////////////////////////////////
	// The coordinates are validated.
	// A 400 response is returned from invalid formatting.
	rq().Post("/api/paint/a@@b").Send(goodColorPayload).
		Expect(400, "BAD_REQUEST", "base64")

	// /////////////////////////////////////////////////////////////
	// // A 404 is returned when a block does not have a parent yet.
	// rq().Post("/api/paint/0000").Send(goodColorPayload).
	// 	Expect(404, "NOT_FOUND", "Block not found.")

	/////////////////////////////////////////////////////////
	// The "color" field is required.
	rq().Post("/api/paint/"+urlCoords("010101,010101")).
		Expect(400, "BAD_REQUEST", "body.color")

	///////////////////////////////////////////////////////////
	// The "color" field is validated, rejecting invalid input.
	invalidColors := []string{
		"FF000", "FF0000FF", "abcdefg", "g", "a", "ab", "1", "12", "123a", "1234", "12345", "12345 6", "😃", " ",
	}
	for _, color := range invalidColors {
		rq().Post("/api/paint/"+urlCoords("010101,010101")).Send(paintInput{
			Color: color,
		}).Expect(400, "BAD_REQUEST")
	}

	//////////////////////////////////////////////////////////////////////////////////
	// Blocks can be set and then updated within a certain time period until they dry.
	rq().Post("/api/paint/"+urlCoords("010101,010101")).Send(paintInput{
		Color: "f00",
	}).Expect(200, "PIXEL_SET")

	rq().Post("/api/paint/"+urlCoords("010101,010101")).Send(paintInput{
		Color: "ff0",
	}).Expect(200, "PIXEL_SET")

	// ////////////////////////////////////////////////////////////////////////////////
	// // A 404 is returned when a block parent is not dry yet. Same as when the parent
	// // doesn't exist.
	// rq().Post("/api/block/00").Send(goodColorPayload).
	// 	Expect(404, "NOT_FOUND", "Block not found.")

	// tc.Advance(time.Hour)
	// rq().Post("/api/block/00").Send(goodColorPayload).
	// 	Expect(200, "BLOCK_SET")

	// tc.Advance(time.Hour)
	// rq().Post("/api/block/000").Send(goodColorPayload).
	// 	Expect(200, "BLOCK_SET")

	// tc.Advance(time.Hour)
	// rq().Post("/api/block/0000").Send(goodColorPayload).
	// 	Expect(200, "BLOCK_SET")

	////////////////////////////////////////////////////////////////////////////////
	// A 400 BLOCK_DRY is returned if we try to set a block that has already dried.
	tc.Advance(time.Hour)
	rq().Post("/api/paint/"+urlCoords("010101,010101")).Send(goodColorPayload).
		Expect(400, "PIXEL_DRY")
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestBlockController_RateLimiting(t *testing.T) {
	app, rq, tc := createPaintControllerTester(t, "")
	defer app.RequireStop()

	// We are allowed a certain number of Get and Set operations at once. Operations
	// share the same quota.
	for i := 0; i < 10; i++ {
		rq().Post("/api/paint/"+urlCoords("010101,010101")).
			Send(paintInput{Color: "F00"}).Expect(200, "PIXEL_SET")
	}

	for i := 0; i < 10; i++ {
		rq().Post("/api/paint/"+urlCoords("010101,010101")).
			Send(paintInput{Color: "F00"}).Expect(429, "RATE_LIMIT")
		rq().Post("/api/paint/"+urlCoords("010101,010101")).
			Expect(429, "RATE_LIMIT")
		tc.Advance(time.Millisecond * 100)
		rq().Post("/api/paint/"+urlCoords("010101,010101")).
			Send(paintInput{Color: "F00"}).Expect(200, "PIXEL_SET")

		rq().Get("/api/block/Aw==").Expect(429, "RATE_LIMIT")
		tc.Advance(time.Millisecond * 200)
		rq().Get("/api/block/Aw==").Expect(200, "BLOCK")
		rq().Get("/api/block/Aw==").Expect(200, "BLOCK")
	}
}
