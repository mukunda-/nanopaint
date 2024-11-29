// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package block2

import "strings"

func coordsFromBits(x, y string) Coords {
	x = strings.ReplaceAll(x, " ", "")
	y = strings.ReplaceAll(y, " ", "")
	if len(x) != len(y) {
		panic("unequal coords components")
	}
	coords := MakeEmptyCoords()
	for i := 0; i < len(x); i++ {
		bx := x[i] - '0'
		by := y[i] - '0'
		coords = coords.Down(bx, by)
	}
	return coords
}
