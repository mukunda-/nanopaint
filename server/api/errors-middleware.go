// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"github.com/labstack/echo/v4"
	"go.mukunda.com/nanopaint/cat"
)

// This middleware helps with error handling. It catches panics and translates them into
// HTTP errors. "Internal" errors are not forwarded to the client, but other errors such
// as permission errors or bad requests are shown to the client.

// ---------------------------------------------------------------------------------------
func translateErrorForEcho(c Ct, ce cat.ControlledError) error {
	switch tc := ce.Problem.(type) {
	case cat.ArgumentError:
		return echo.NewHTTPError(400, baseResponse{
			"BAD_REQUEST",
			ce.Problem.Error(),
		})
	case cat.PermissionError:
		return echo.NewHTTPError(403, baseResponse{
			"FORBIDDEN",
			ce.Problem.Error(),
		})
	case cat.NotFoundError:
		return echo.NewHTTPError(404, baseResponse{
			"NOT_FOUND",
			ce.Problem.Error(),
		})
	case cat.ExecutionError:
		return echo.NewHTTPError(500, baseResponse{
			"INTERNAL_ERROR",
			"An internal error occurred and has been logged.",
		})
	case cat.UnknownError:
		return echo.NewHTTPError(500, baseResponse{
			"UNKNOWN_ERROR",
			"An internal error occurred and has been logged.",
		})
	case cat.OtherError:
		err := tc.Unwrap()
		if _, ok := err.(*echo.HTTPError); ok {
			// It is a wrapped HTTP error.
			return err
		}

		// Otherwise, we don't know what to do with it.
		log.WithError(c, err).Errorln("Encountered wrapped error that we did not handle for HTTP.")
		return echo.NewHTTPError(500, baseResponse{
			"UNKNOWN_ERROR",
			"An internal error occurred and has been logged.",
		})
	}

	log.WithField(c, "err", ce).Errorln("Could not translate controlled error for HTTP.")
	return echo.NewHTTPError(500, baseResponse{
		"UNKNOWN_ERROR",
		"An internal error occurred and has been logged.",
	})
}

func installErrorsMiddleware(e *echo.Echo) {
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (ret error) {
			defer func() {
				if recovered := recover(); recovered != nil {
					ce := cat.Handle(c, recovered)
					ret = translateErrorForEcho(c, ce)
				}
			}()

			// Run the request.
			return next(c)
		}
	})
}
