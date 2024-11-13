//////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
//////////////////////////////////////////////////////////////////////////////////////////
package core

type (
	BlockCoords byte[]
)

func (c BlockCoords) Parent() BlockCoords {
	return c[:len(c)-1]
}

func (c BlockCoords) Child(x, y uint8) BlockCoords {
	return append(c, x + (y << 3))
}
