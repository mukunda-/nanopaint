// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package config

import (
	"go.mukunda.com/nanopaint/common"
)

var log = common.GetLogger("config")

// ---------------------------------------------------------------------------------------
type Config interface {
	//
	Load(key string, result any)
}
