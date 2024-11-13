//////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
//////////////////////////////////////////////////////////////////////////////////////////
package core

type (
	Color uint32

	Pixel struct {
		Color   Color
		DryTime PixelTime
	}

	Block struct {
		Pixels [8*8]Pixel
	}

	BlockRepo interface {
		GetBlock(coords BlockCoords) (Block, error)
		SetPixel(coords BlockCoords, color Color)
	}
)
