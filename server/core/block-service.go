//////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
//////////////////////////////////////////////////////////////////////////////////////////

package core

type (
	BlockCoords string
	PixelCoords string

	Color struct {
		R, G, B uint8
	}

	Pixel struct {
		Color   Color
		DryTime PixelTime
	}

	Block struct {
		Pixels [8][8]Color
	}

	BlockService interface {
		GetBlock(coords BlockCoords) (Block, error)
		SetPixel(coords PixelCoords, color Color)
	}
)
