package block2

import (
	"slices"
)

// ---------------------------------------------------------------------------------------
type (
	// Last byte is a header. The rest are packed coordinates.
	// header bits: ------mm
	// bit length = byte length - 4 + (mm + 1)
	Coords struct {
		Bitmod uint8
		Coords []byte
	}
)

// ---------------------------------------------------------------------------------------
func MakeEmptyCoords() Coords {
	return Coords{
		Bitmod: 3,
		Coords: []byte{},
	}
}

// ---------------------------------------------------------------------------------------
func (c Coords) Copy() Coords {
	return Coords{
		Bitmod: c.Bitmod,
		Coords: slices.Clone(c.Coords),
	}
}

// ---------------------------------------------------------------------------------------
func (c Coords) BitLength() int {
	return len(c.Coords)*4 - 4 + int(c.Bitmod) + 1
}

// ---------------------------------------------------------------------------------------
// Goes up 6 levels.
func (c Coords) ParentOfPixel() Coords {
	if c.BitLength() < 6 {
		// must have bit length >= 6
		panic("invalid pixel coordinate")
	}
	return c.Up(6)
}

// ---------------------------------------------------------------------------------------
// Gets the lowest 6 bits of X and Y.
func (c Coords) PixelIndex() int {
	if c.BitLength() < 6 {
		// must have bit length >= 6
		panic("invalid pixel coordinate")
	}

	totalBits := c.Bitmod + 1
	bits := int(c.Coords[len(c.Coords)-1])
	x := bits >> (4 - totalBits) & 0xF
	y := (bits >> (4 + 4 - totalBits)) & 0xF

	reader := len(c.Coords) - 2

	// worst case is 1 bit + 4 bits + 4 bits
	for totalBits < 6 {
		bits := int(c.Coords[reader])
		x |= (bits & 0x0F) << totalBits
		y |= (bits >> 4) << totalBits
		totalBits += 4
		reader--
	}

	x &= 63
	y &= 63

	return x + (y << 6)
}

// ---------------------------------------------------------------------------------------
func (c Coords) Up(levels int) Coords {
	newmod := int(c.Bitmod)
	newcoords := slices.Clone(c.Coords)

	if c.BitLength() < levels {
		panic("attempt to get coords parent out of range")
	}

	if levels >= 4 {
		newcoords = newcoords[:len(newcoords)-(levels>>2)]
	}

	if levels&3 > 0 {
		newmod -= levels & 3
		if newmod < 0 {
			newcoords = newcoords[:len(newcoords)-1]
			newmod += 4
		}

		if len(newcoords) > 0 {
			// mask any cleared bits. A requirement in the spec is that the last byte MUST
			// set unused bits to 0. Otherwise we could have duplicate map entries.
			mask := 0xF << (3 - newmod) & 0xF
			mask |= mask << 4
			newcoords[len(newcoords)-1] &= byte(mask)
		}
	}

	return Coords{
		Bitmod: uint8(newmod),
		Coords: newcoords,
	}
}

// ---------------------------------------------------------------------------------------
func (c Coords) Down(x, y uint8) Coords {
	// Copy operation here to avoid modifying the original if it's shared by a deeper
	// coordinate.
	coords := slices.Clone(c.Coords)
	bitmod := int(c.Bitmod)

	if len(coords) == 0 && bitmod != 3 {
		panic("unexpected coordinate header - bitmod should be 3 for zero coords")
	}

	if x > 1 || y > 1 {
		panic("invalid child coordinates, must be 0-1")
	}

	nextBits := x + (y << 4)

	bitmod += 1
	if bitmod == 4 {
		bitmod = 0
		coords = append(coords, 0)
	}

	L := len(coords) - 1

	coords[L] = coords[L] | (nextBits << (3 - bitmod))

	return Coords{
		Bitmod: uint8(bitmod),
		Coords: coords,
	}
}

// ---------------------------------------------------------------------------------------
func (c Coords) ToBytes() []byte {
	// Copy coords here to avoid modifying the original if it's shared by another
	// deeper coordinate.
	// (append may modify the original data)
	return append(slices.Clone(c.Coords), c.Bitmod)
}

// ---------------------------------------------------------------------------------------
func CoordsFromBytes(bytes []byte) Coords {
	c := Coords{
		Bitmod: bytes[len(bytes)-1],
		Coords: bytes[:len(bytes)-1],
	}

	if len(c.Coords) == 0 && c.Bitmod != 3 {
		panic("bitmod must be 3 for zero length coords")
	}

	if c.Bitmod > 3 {
		panic("bitmod must be 3 or less")
	}

	return c
}
