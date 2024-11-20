// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"strconv"
	"testing"

	"go.mukunda.com/nanopaint/test"
)

func testreq(t *testing.T, hs HttpService) *test.Request {
	return test.MakeRequest(t, "http://localhost:"+strconv.Itoa(hs.GetPort()))
}
