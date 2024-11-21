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

// All responses must contain a code with an optional message.
type baseResponse struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}
