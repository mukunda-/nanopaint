// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"math/rand"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mukunda.com/nanopaint/clock"
)

// ///////////////////////////////////////////////////////////////////////////////////////
func testBlockRepoDryTime(t *testing.T, repo BlockRepo, tcs *clock.TestClockService) {
	/////////////////////////////////////////////////////////////////////////////////////
	// The drying time is based on the depth of the block. Currently:
	// Level 0: 15 seconds
	// Level 1: 30 seconds
	// Level 2: 1 minute
	// Level 3: 2.5 minutes
	// Level 4: 5 minutes
	// Level 5+: 10 minutes
	//
	// Level 0 is a blockcoord with 1 byte, block zero, or the block at empty coordiantes,
	// is already dry.

	// Start with a top level pixel.
	repo.SetBlock(Coords{0}, 0x000000)

	dryTimes := []int{15, 30, 60, 150, 300, 600, 600, 600}
	coords := Coords{0, 0}

	for level := 0; level <= 5; level++ {
		// Advance to one second before the dry time.
		tcs.Advance(time.Second * time.Duration(dryTimes[level]-1))
		repo.DryPixels()
		err := repo.SetBlock(coords, 0x000000)
		assert.ErrorIs(t, err, ErrBlockNotFound) // Errors: still not dry.

		tcs.Advance(time.Second)
		repo.DryPixels()
		err = repo.SetBlock(coords, 0x000000)
		assert.NoError(t, err)

		// Next level.
		coords = coords.Child(0, 0)
	}
}

// ///////////////////////////////////////////////////////////////////////////////////////
func testBlockRepoSetGet(t *testing.T, repo BlockRepo, tcs *clock.TestClockService) {
	////////////////////////////////////////////////////////////
	// Setting pixels requires an existing parent.
	// We start with one block at the very top.
	////////////////////////////////////////////////////////////

	{
		// Level 0: valid to get
		block, err := repo.GetBlock(Coords{})
		assert.NotNil(t, block)
		assert.NoError(t, err)
	}

	{
		// Level 1: invalid to get
		block, err := repo.GetBlock(Coords{0})
		assert.Nil(t, block)
		assert.ErrorIs(t, err, ErrBlockNotFound)
	}

	{
		// Passing the Zero Block to SetPixel is always invalid.
		err := repo.SetBlock(Coords{}, 0x000000)
		assert.Equal(t, ErrBlockIsDry, err)
	}

	{
		// Invalid to set a pixel without a parent.
		// BlockCoords{0, 0} is two levels down (invalid).
		err := repo.SetBlock(Coords{0, 0}, 0x000000)
		assert.Equal(t, ErrBlockNotFound, err)
		err = repo.SetBlock(Coords{0, 0, 0}, 0x000000)
		assert.Equal(t, ErrBlockNotFound, err)
	}

	////////////////////////////////////////////////////////////////////////////
	// Pixels can only be set or updated if they are not "dry" yet.
	// When setting a non-dry pixel, the color is updated and the time is
	// tracked. When the time reaches the drying threshold, the pixel turns dry.
	// Once dry, the pixel cannot be modified directly, but a sub block can
	// be created.
	////////////////////////////////////////////////////////////////////////////
	for reps := 0; reps < 3; reps++ {
		// Repeat this 3 times, all should succeed because it takes time to dry.
		// First pass, set all pixels.
		// Second pass, update all pixels (valid because it isn't dry)
		// Third pass, same thing.
		for x := 0; x < 8; x++ {
			for y := 0; y < 8; y++ {
				// Since we are dealing with a new repository, this should never be dry.
				// Paint it black.
				err := repo.SetBlock(Coords{}.Child(uint8(x), uint8(y)), 0x000000)
				assert.Nil(t, err)
			}
		}
	}

	{
		////////////////////////////////////////////////////////////
		// Setting a pixel of a block that is not dry is not valid.
		// We set the parent pixel above, but it is not dry yet.
		// Sub-blocks are only created when the parent pixel is dry.
		err := repo.SetBlock(Coords{0, 0}, 0x000000)
		assert.Equal(t, ErrBlockNotFound, err)

		block, err := repo.GetBlock(Coords{0, 0})
		assert.Nil(t, block)
		assert.ErrorIs(t, err, ErrBlockNotFound)
	}

	///////////////////////////////////////////////////////////////////////////////////
	// The clock must advance before the pixel dries. Until then, sub-blocks may not be
	// created or modified.

	tcs.Advance(time.Second * time.Duration(15))
	repo.DryPixels()

	// The pixel is dry now.

	{
		////////////////////////////////////////////////////////////
		// Sub-blocks are not created until we set a pixel in them.
		block, err := repo.GetBlock(Coords{0})
		assert.Nil(t, block)
		assert.Equal(t, ErrBlockNotFound, err)

		err = repo.SetBlock(Coords{0, 0}, 0x000000)
		assert.NoError(t, err)

		block, err = repo.GetBlock(Coords{0})
		assert.NotNil(t, block)
		assert.NoError(t, err)
	}

	{
		////////////////////////////////////////////////////////////////////
		// Trying to set invalid colors panics, warning programmer of error
		// Colors are 24-bit. Setting the upper bits past 24 is forbidden.
		for test := 1; test <= 255; test++ {
			assert.Panics(t, func() {
				repo.SetBlock(Coords{1}, Color(test<<24|rand.Intn(0x1000000)))
			})
		}
	}
}

// ///////////////////////////////////////////////////////////////////////////////////////
func computeBlockAverageNaive(block Block) Color {
	var r, g, b int
	for _, pixel := range block.Pixels {
		r += int(pixel & 0xff)
		g += int(pixel >> 8 & 0xff)
		b += int(pixel >> 16 & 0xff)
	}

	r = (r + 32) >> 6
	g = (g + 32) >> 6
	b = (b + 32) >> 6

	return Color(r | g<<8 | b<<16)
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestBlockAverage(t *testing.T) {
	block := Block{}

	//////////////////////////////////////////////////////////////////////////
	// The block average is computed from the average of all pixel components.
	// Rounding is used.
	for test := 0; test < 100; test++ {
		block.Pixels = [64]Pixel{}
		for i := 0; i < 64; i++ {
			dry := rand.Intn(2) == 0
			if dry {
				block.Pixels[i] = Pixel(rand.Intn(0x1000000)) | PIXEL_PAINTED | PIXEL_DRY
			} else {
				block.Pixels[i] = Pixel(rand.Intn(0x1000000)) | PIXEL_PAINTED
			}
		}

		// This function implements the averaging with rounding spec correctly.
		// Compare against the optimal implementation.
		average := computeBlockAverageNaive(block)
		assert.Equal(t, average, block.GetAverage())
	}
}
