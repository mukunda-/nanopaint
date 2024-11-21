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

func TestErrorsMiddleware(t *testing.T) {
	/////////////////////////////////////////////////////////
	// When the cat module handles a controlled error, we translate it into an HTTP
	// response.
	//
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

				// Testing the different error wrappers to make sure that we wrap the result
				// properly. Also does some additional testing against the cat module,
				// irrelevant to our middleware.
				t := c.Param("type")
				switch t {
				case "bad1":
					// Arguemnt errors become 400 bad request.
					cat.BadIf(false, "not bad request text")
					cat.BadIf(true, "bad request text")
				case "custom1":
					// Custom HTTP errors created with Echo can be used directly with catch.
					// They will be forwarded to the response, so, for example, you can panic
					// with an Echo error and it will be displayed to the user.
					cat.Catch(false, echo.NewHTTPError(499, "not used"))
					cat.Catch(true,
						echo.NewHTTPError(499, baseResponse{"CUSTOM1", "499 custom1"}))
				case "bubble-error":
					// Bubble is a convenience catch to stop execution if an error is detected.
					// These raise http 500 errors and give a generic response to the user
					// The error is logged.
					cat.Bubble(nil)
					cat.Bubble(errors.New("test bubble-error (not shown in response)"))
				case "ise":
					// Catching general conditions raises a 500 internal server error and
					// the text is not shown to the user (logged internally).
					cat.Catch(false, "not ise error")
					cat.Catch(true, "ise error (this is not shown in the response)")
				case "denied1":
					// PermissionErrors will show as 403 forbidden with the provided message.
					cat.DenyIf(false, "denied0")
					cat.DenyIf(true, "denied1")
				case "notfound1":
					// NotFound errors will show as 404 Not Found with the provided message.
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
