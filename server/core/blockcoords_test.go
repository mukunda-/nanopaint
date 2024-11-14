// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

// ///////////////////////////////////////////////////////////////////////////////////////
import (
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
)

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoords(t *testing.T) {
	// Block Coordinates or BlockCoords are a fundamental address type in our system.
	// They are used to address pixels or blocks on the canvas.

	// BlockCoords are a slice of bytes. The length determines the depth of a block.
	// e.g., {0} is depth zero, {0, 0} is depth one (the first pixel of the top block).
	coords := BlockCoords{0, 1, 2}

	/////////////////////////////////////////////////////////
	// Parent() reduces the depth by 1.
	assert.EqualValues(t, BlockCoords{0, 1}, coords.Parent())
	// (Make sure we understand how these test functions work.)
	assert.NotEqualValues(t, BlockCoords{0, 2}, coords.Parent())
	assert.NotEqualValues(t, BlockCoords{2, 0}, coords.Parent())

	/////////////////////////////////////////////////////////
	// Child() is used to select a pixel in a given block.
	// The x and y values are the coordinates of the pixel in
	// the block, ranging from 0-7.
	assert.EqualValues(t, BlockCoords{0, 1, 2, 3}, coords.Child(3, 0))
	assert.EqualValues(t, BlockCoords{0, 1, 2, 2 << 3}, coords.Child(0, 2))
	assert.EqualValues(t, BlockCoords{0, 1, 2, 3 + (2 << 3)}, coords.Child(3, 2))

	/////////////////////////////////////////////////////////
	// Using an invalid range panics.
	assert.Panics(t, func() { coords.Child(8, 0) })
	assert.Panics(t, func() { coords.Child(0, 8) })
	assert.Panics(t, func() { coords.Child(0, 255) })
	assert.Panics(t, func() { coords.Child(1, 255) })
	assert.Panics(t, func() { coords.Child(255, 255) })
	assert.Panics(t, func() { coords.Child(255, 1) })

	/////////////////////////////////////////////////////////
	// Parent() nullifies Child()
	assert.EqualValues(t, coords, coords.Child(3, 2).Parent())

	/////////////////////////////////////////////////////////
	// The parent of the top-level block is not valid and
	// panics.
	assert.Panics(t, func() { BlockCoords{}.Parent() })

	// The upper two bits of each byte are not used.

}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsFormatting(t *testing.T) {
	coords := BlockCoords{0, 1, 2}

	// Coords are formatted either as a base64 cipher or as hex. The hex encoding takes
	// 2 characters per depth level, while base64 takes 1 character per depth level.
	// The upper two bits of each coordinate byte are not used, making base64 easy.
	assert.Equal(t, "012", coords.ToString())
	assert.Equal(t, "000102", coords.ToHex())

	coords = BlockCoords{0, 5, 10, 15, 20, 25, 30}
	assert.Equal(t, "05afkpu", coords.ToString())
	assert.Equal(t, "00050a0f14191e", coords.ToHex())

	// Empty coords formats to empty string.
	coords = BlockCoords{}
	assert.Equal(t, "", coords.ToString())
	assert.Equal(t, "", coords.ToHex())
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsParsing(t *testing.T) {
	assert.Equal(t, BlockCoords{0, 1, 2}, CoordsFromString("012"))
	assert.Equal(t, BlockCoords{}, CoordsFromString(""))

	for i := 0; i < 100; i++ {
		length := rand.Intn(100)
		coords := make(BlockCoords, length)
		for j := 0; j < length; j++ {
			coords[j] = byte(rand.Intn(64))
		}
		assert.Equal(t, coords, CoordsFromString(coords.ToString()))
		assert.Equal(t, coords, CoordsFromHex(coords.ToHex()))
	}
}
