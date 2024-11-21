// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"github.com/labstack/echo/v4"
	"go.mukunda.com/nanopaint/cat"
)

// ---------------------------------------------------------------------------------------
type httpMessage struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}

// ---------------------------------------------------------------------------------------
func translateErrorForEcho(c Ct, ce cat.ControlledError) error {
	switch tc := ce.Problem.(type) {
	case cat.ArgumentError:
		return echo.NewHTTPError(400, httpMessage{
			"BAD_REQUEST",
			ce.Problem.Error(),
		})
	case cat.PermissionError:
		return echo.NewHTTPError(403, httpMessage{
			"FORBIDDEN",
			ce.Problem.Error(),
		})
	case cat.NotFoundError:
		return echo.NewHTTPError(404, httpMessage{
			"NOT_FOUND",
			ce.Problem.Error(),
		})
	case cat.ExecutionError:
		return echo.NewHTTPError(500, httpMessage{
			"INTERNAL_ERROR",
			"An internal error occurred and has been logged.",
		})
	case cat.UnknownError:
		return echo.NewHTTPError(500, httpMessage{
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
		return echo.NewHTTPError(500, httpMessage{
			"UNKNOWN_ERROR",
			"An internal error occurred and has been logged.",
		})
	}

	log.WithField(c, "err", ce).Errorln("Could not translate controlled error for HTTP.")
	return echo.NewHTTPError(500, httpMessage{
		"UNKNOWN_ERROR",
		"An internal error occurred and has been logged.",
	})
}
