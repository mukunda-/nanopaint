// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "errors"

type (
	Color uint32
	Pixel uint32
	// Pixel structure:
	// FFBBGGRR
	// See PIXEL_* flags

	Block struct {
		Pixels [8 * 8]Pixel
	}

	BlockRepo interface {
		// Gets the block at the given coordinates. Returns an error if the block cannot
		// exist yet (e.g., invalid or wet parent).
		GetBlock(coords BlockCoords) (*Block, error)

		// Sets the pixel at the given coordinates. Returns an error if the pixel cannot be
		// set or doesn't exist.
		SetPixel(coords BlockCoords, color Color) error

		// Routine function to dry pending pixels. May be called automatically by real
		// implementations.
		DryPixels()
	}
)

var (
	ErrBadCoords     = errors.New("given coordinates are not valid")
	ErrBlockNotFound = errors.New("block does not exist")
	ErrPixelIsDry    = errors.New("pixel is already dry")

	// How long in seconds it takes for each level to dry (max is on the right).
	DRY_TIME = []int{0, 15, 30, 60, 150, 300, 600}
)

const (
	// Pixel flags.

	// The pixel is dry and a sub-block can be made.
	PIXEL_DRY Pixel = 0x80 << 24

	// This is to help clients realize that a pixel is wet and going to dry later.
	// As opposed to not knowing if the pixel was set or inherited.
	PIXEL_PAINTED Pixel = 0x40 << 24

	PIXEL_FLAG_MASK  Pixel = 0xFF000000
	PIXEL_COLOR_MASK Pixel = 0xFFFFFF
)

// ---------------------------------------------------------------------------------------
func (bl *Block) GetAverage() Color {
	var sum int64
	for _, pixel := range bl.Pixels {
		sum += int64(pixel & 0xFF00FF)     // Blue and Red
		sum += int64(pixel&0x00FF00) << 24 // Green
	}
	// Apply rounding.
	// 32 + (32 << 16) + (32 << 32)
	sum += 0x2000200020

	// Shift the components back into place and mask.
	return Color(((sum >> 6) & 0xFF00FF) + (sum >> (24 + 6) & 0x00FF00))
}

// ---------------------------------------------------------------------------------------
func GetDryTime(coords BlockCoords) int {
	level := len(coords)
	if level >= len(DRY_TIME) {
		return DRY_TIME[len(DRY_TIME)-1]
	}

	return DRY_TIME[level]
}
