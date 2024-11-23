// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"encoding/hex"
)

// ----------------------------------------------------------------------------------------
type (
	Coords       []byte
	CoordsFormat int
)

const (
	BASE64_COORDS_FORMAT CoordsFormat = 1
	HEX_COORDS_FORMAT    CoordsFormat = 2
)

const BASE64_COORDS_CIPHER = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_"

var reverseCoordsCipher = [256]byte{}

// ---------------------------------------------------------------------------------------
func (c Coords) Parent() Coords {
	if len(c) == 0 {
		panic("the top level block has no parent")
	}
	return c[:len(c)-1]
}

// ---------------------------------------------------------------------------------------
func (c Coords) Child(x, y uint8) Coords {
	if (x >= 8) || (y >= 8) {
		panic("invalid child coordinates")
	}

	return append(c, x+(y<<3))
}

// ---------------------------------------------------------------------------------------
func (c Coords) ToString() string {
	str := make([]byte, 0, len(c))
	for _, b := range c {
		str = append(str, BASE64_COORDS_CIPHER[b])
	}
	return string(str)
}

// ---------------------------------------------------------------------------------------
func (c Coords) ToHex() string {
	return hex.EncodeToString(c)
}

// ---------------------------------------------------------------------------------------
func CoordsFromString(str string) Coords {
	coords := make([]byte, 0, len(str))
	for _, c := range []byte(str) {
		coords = append(coords, reverseCoordsCipher[c])
	}

	return coords
}

// ---------------------------------------------------------------------------------------
func CoordsFromHex(str string) Coords {
	coords, err := hex.DecodeString(str)
	if err != nil {
		panic(err)
	}

	return coords
}

// ---------------------------------------------------------------------------------------
func init() {
	for i := 0; i < len(BASE64_COORDS_CIPHER); i++ {
		reverseCoordsCipher[BASE64_COORDS_CIPHER[i]] = byte(i)
	}
}
