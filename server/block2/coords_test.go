package block2

import (
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// ///////////////////////////////////////////////////////////////////////////////////////
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

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsCopy(t *testing.T) {
	a := MakeEmptyCoords().Down(1, 1).Down(1, 1)
	b := a.Copy().Up(1)

	// When copied, the data is not shared with the original.
	b.Coords[0] = 5
	assert.NotEqualValues(t, a, b)
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsDown(t *testing.T) {
	// When bits are added to coords, they are added in pairs and the depth increases.
	// The bit data is added from MSB to LSB, updating the "bitmod" as it works through
	// each byte.

	// Each 4 bits is interleaved.
	// For example, adding a sequence of zeroes to X and ones to Y:
	// <empty> bitmod=3
	// 1---0--- bitmod=0
	// 11--00-- bitmod=1
	// 111-000- bitmod=2
	// 11110000 bitmod=3
	// 11110000 1---0--- bitmod=0
	// Bit length = len(coords)*4 - 4 + bitmod + 1
	// Bit length is the length of one component (total / 2)

	coords := MakeEmptyCoords()
	assert.Equal(t, 0, coords.BitLength())
	// The last byte when converting ToBytes is the bitmod.
	assert.Equal(t, []byte{0b0000_0011}, coords.ToBytes())

	coords = coords.Down(0, 1)
	assert.Equal(t, 1, coords.BitLength())
	assert.Equal(t, []byte{0b1000_0000, 0b0000_0000}, coords.ToBytes())

	coords = coords.Down(1, 0)
	assert.EqualValues(t, 2, coords.BitLength())
	assert.Equal(t, []byte{0b1000_0100, 0b0000_0001}, coords.ToBytes())

	coords = coords.Down(1, 1)
	assert.EqualValues(t, 3, coords.BitLength())
	assert.Equal(t, []byte{0b1010_0110, 0b0000_0010}, coords.ToBytes())

	coords = coords.Down(0, 0)
	assert.EqualValues(t, 4, coords.BitLength())
	assert.Equal(t, []byte{0b1010_0110, 0b0000_0011}, coords.ToBytes())

	coords = coords.Down(1, 0)
	assert.EqualValues(t, 5, coords.BitLength())
	assert.Equal(t, []byte{0b1010_0110, 0b0000_1000, 0b0000_0000}, coords.ToBytes())
}

func coordsToString(coords Coords) string {
	x := ""
	y := ""
	for i := 0; i < coords.BitLength(); i++ {
		b := coords.Coords[i/4]
		bit := i % 4
		if b&(0x8>>bit) != 0 {
			x += "1"
		} else {
			x += "0"
		}

		if b&(0x80>>bit) != 0 {
			y += "1"
		} else {
			y += "0"
		}
	}
	return x + "," + y
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsUp(t *testing.T) {
	//////////////////////////////////////////////////////////////////
	// Traversing upward removes the least significant bits from the given coords.

	coords := coordsFromBits("0000 0101 1111 001", "1111 1010 0000 110")

	coords = coords.Up(1)
	assert.Equal(t, "00000101111100,11111010000011", coordsToString(coords))

	coords = coords.Up(2)
	assert.Equal(t, "000001011111,111110100000", coordsToString(coords))

	coords = coords.Up(3)
	assert.Equal(t, "000001011,111110100", coordsToString(coords))

	// Ensure that the bits are erased, so going back down works as expected.
	coords = coords.Down(0, 0).Down(0, 0).Down(0, 0)
	assert.Equal(t, "000001011000,111110100000", coordsToString(coords))

	coords = coords.Up(1)
	assert.Equal(t, "00000101100,11111010000", coordsToString(coords))

	coords = coords.Up(5)
	assert.Equal(t, "000001,111110", coordsToString(coords))

	coords = coords.Up(5)
	assert.Equal(t, "0,1", coordsToString(coords))

	coords = coords.Up(1)
	assert.Equal(t, ",", coordsToString(coords))

	////////////////////////////////////////////////////
	// Empty coordinates have no parent and will panic.
	assert.Panics(t, func() {
		coords = coords.Up(1)
	})

	// Confirm that also happens when doing multiple levels at once.
	coords = coords.Down(0, 0)
	assert.Panics(t, func() {
		coords = coords.Up(2)
	})
}

// ///////////////////////////////////////////////////////////////////////////////////////
func TestCoordsPixelIndex(t *testing.T) {
	var index int

	//////////////////////////////////////////////////////////////////
	// The pixel index is calculated as the lower 6 bits of both components
	// added together in the bit format yyyyyyxxxxxx.
	index = coordsFromBits("100011", "100011").PixelIndex()
	assert.Equal(t, 0b100011+(0b100011<<6), index)

	// We'll test a bunch of times with different lengths to make sure they are parsed
	// correctly from the byte data.
	testX := 0b100001011111001
	testY := 0b111110100000110

	// Just a long prefix
	prefix := "000001011111001111110100000110000001011111001111110100000110"

	for i := 0; i < 10; i++ {
		index = coordsFromBits(
			prefix+fmt.Sprintf("%b", testX),
			prefix+fmt.Sprintf("%b", testY)).PixelIndex()
		assert.Equal(t, testX&63+((testY&63)<<6), index)
		testX >>= 1
		testY >>= 1
	}

	index = coordsFromBits("101010", "111100").PixelIndex()
	assert.Equal(t, 0b101010+(0b111100<<6), index)

	//////////////////////////////////////////////////////////////////
	// We cannot get the pixel index if the bit length is less than 6.

	assert.Panics(t, func() {
		coordsFromBits("10101", "11110").PixelIndex()
	})
}

func TestCoordsAreImmutable(t *testing.T) {
	// Make sure that these functions are not affecting the original. Mistakes like this
	// can creep up when working with slices/copies.
	coords := coordsFromBits("100011", "100011")
	coords.Up(1)
	assert.Equal(t, "100011,100011", coordsToString(coords))

	coords = coordsFromBits("100011", "100011")
	coords.Down(1, 1)
	assert.Equal(t, "100011,100011", coordsToString(coords))
}
