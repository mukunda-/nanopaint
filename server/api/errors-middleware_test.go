// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"errors"
	"testing"

	"github.com/labstack/echo/v4"
	"go.mukunda.com/nanopaint/cat"
	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

type testErrorsController struct{}

func TestErrorsMiddleware(t *testing.T) {
	var hs HttpService
	app := fxtest.New(t,

		config.ProvideFromYamlString(``),
		fx.Provide(
			CreateHttpService,
			unwrapHttpRouter,
			core.CreateTestClockService,
		),
		fx.Invoke(func(phs HttpService) {
			hs = phs
			hs.Router().POST("/test/:type", func(c Ct) error {

				type httpMessage struct {
					Code    string `json:"code"`
					Message string `json:"message,omitempty"`
				}

				// Testing the different error wrappers to make sure that we wrap the result
				// properly. Also does some additional testing against the cat module,
				// irrelevant to our middleware.
				t := c.Param("type")
				switch t {
				case "bad1":
					cat.BadIf(false, "not bad request text")
					cat.BadIf(true, "bad request text")
				case "custom1":
					cat.Catch(false, echo.NewHTTPError(499, "not used"))
					cat.Catch(true,
						echo.NewHTTPError(499, httpMessage{"CUSTOM1", "499 custom1"}))
				case "bubble-error":
					cat.Bubble(nil)
					cat.Bubble(errors.New("test bubble-error (not shown in response)"))
				case "ise":
					cat.Catch(false, "not ise error")
					cat.Catch(true, "ise error (this is not shown in the response)")
				case "denied1":
					cat.DenyIf(false, "denied0")
					cat.DenyIf(true, "denied1")
				case "notfound1":
					cat.NotFoundIf(false, "notfound0")
					cat.NotFoundIf(true, "notfound1")
				}

				return c.JSON(405, "not implemented")
			})
		}),
	).RequireStart()
	defer app.RequireStop()

	// Test bad request
	testreq(t, hs).Post("/test/bad1").Expect(400, "BAD_REQUEST", "bad request text")
	testreq(t, hs).Post("/test/custom1").Expect(499, "CUSTOM1", "499 custom1")
	testreq(t, hs).Post("/test/bubble-error").Expect(500, "INTERNAL_ERROR", "An internal error occurred and has been logged.")
	testreq(t, hs).Post("/test/ise").Expect(500, "INTERNAL_ERROR", "An internal error occurred and has been logged.")
	testreq(t, hs).Post("/test/denied1").Expect(403, "FORBIDDEN", "denied1")
	testreq(t, hs).Post("/test/notfound1").Expect(404, "NOT_FOUND", "notfound1")
}
