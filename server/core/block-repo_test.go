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
)

// ///////////////////////////////////////////////////////////////////////////////////////
func testBlockRepo(t *testing.T, repo BlockRepo, tcs *TestClockService) {
	// Passing the location of the zero block is always invalid.
	err := repo.SetPixel(BlockCoords{}, 0x000000)
	assert.Equal(t, ErrBadCoords, err)

	// Setting a pixel of a block that has no parent is invalid.
	err = repo.SetPixel(BlockCoords{0, 0}, 0x000000)
	assert.Equal(t, ErrBadCoords, err)

	/////////////////////////////////////////////////////////////////////////
	// Setting a pixel of an existing block is valid so long as it isn't dry.
	for reps := 0; reps < 3; reps++ {
		// Repeat this 3 times, all should succeed because it takes time to dry.
		for x := 0; x < 8; x++ {
			for y := 0; y < 8; y++ {
				// Since we are dealing with a new repository, this should never be dry.
				// Paint it black.
				err = repo.SetPixel(BlockCoords{}.Child(uint8(x), uint8(y)), 0x000000)
				assert.Nil(t, err)
			}
		}
	}

	///////////////////////////////////////////////////////////
	// Setting a pixel of a block that is not dry is not valid.
	// We set the parent pixel above, but it is not dry yet.
	tcoords := BlockCoords{0, 0}
	err = repo.SetPixel(tcoords, 0x000000)
	assert.Equal(t, ErrBadCoords, err)

	///////////////////////////////////////////////////////////////////////////////////
	// The clock must advance before the pixel dries. Until then, sub blocks may not be
	// created or modified.

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

	tcs.Advance(time.Second * 16)
	repo.DryPixels()
	err = repo.SetPixel(tcoords, 0x000000)
	assert.NoError(t, err)
}

// ///////////////////////////////////////////////////////////////////////////////////////
func computeBlockAverageNaive(block Block) Color {
	var r, g, b int
	for _, pixel := range block.Pixels {
		r += int(pixel.Color & 0xff)
		g += int(pixel.Color >> 8 & 0xff)
		b += int(pixel.Color >> 16 & 0xff)
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
			block.Pixels[i] = Pixel{Color: Color(rand.Intn(0x1000000))}
		}

		// This function implements the averaging with rounding spec correctly.
		// Compare against the optimal implementation.
		average := computeBlockAverageNaive(block)
		assert.Equal(t, average, block.GetAverage())
	}
}
