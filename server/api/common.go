// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"github.com/labstack/echo/v4"
	"go.mukunda.com/nanopaint/common"
)

var log = common.GetLogger("http")

type Ct = echo.Context
type Controller any

// All responses must contain a code with an optional message. The code is a string that
// represents the type of response. The `code` is intended for client programs, and the
// `message` is intended for humans.

// For example, client programs don't need to understand what a "BAD_REQUEST" is, given
// that those are generally created from programmer errors. The programmer will read the
// message and correct it.

// There may be other bad requests, such as the user trying to paint in an invalid area.
// For those cases, the request can still be HTTP 400, but a more specific `code` should
// be used, so the client can understand.
type baseResponse struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}
