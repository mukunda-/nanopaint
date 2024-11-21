// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"github.com/labstack/echo/v4"
	"go.mukunda.com/nanopaint/cat"
)

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
