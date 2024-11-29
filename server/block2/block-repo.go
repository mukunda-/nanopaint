// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package block2

import "errors"

type (
	Color uint16
	Pixel uint32

	Block struct {
		Pixels []Pixel
		//DryTime int64 (should this be exposed?)
	}

	BlockRepo interface {
		GetBlock(coords Coords) (*Block, error)
		SetPixel(coords Coords, color Color) error
	}
)

var (
	ErrBadCoords     = errors.New("given coordinates are not valid")
	ErrBlockNotFound = errors.New("block does not exist")
	ErrPixelIsDry    = errors.New("pixel is dry")

	// How long in seconds it takes for each level to dry (max is on the right).
	DEFAULT_DRY_TIME = []int{0, 15, 30, 60, 150, 300, 600}
)

const (
	// Pixel flags.
	PIXEL_SET Pixel = 0x80000000
	PIXEL_DRY Pixel = 0x40000000
)
