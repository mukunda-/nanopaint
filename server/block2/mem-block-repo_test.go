// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package block2

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mukunda.com/nanopaint/clock"
)

func mixColors(colors ...Color) Color {
	var r, g, b int
	for _, color := range colors {
		r += int(color & 0xF)
		g += int((color >> 4) & 0xF)
		b += int((color >> 8) & 0xF)
	}

	total := len(colors)
	r = (r + (total / 2)) / total
	g = (g + (total / 2)) / total
	b = (b + (total / 2)) / total

	return Color((b << 8) | (g << 4) | r)
}

func TestMemBlockRepoBubbling(t *testing.T) {
	clock := clock.CreateTestClockService().(*clock.TestClockService)
	repo := CreateMemBlockRepo(clock)

	//
	// When a pixel is set, the color bubbles into the upper layers.
	//

	// The following tests have three stages:
	// (1) Setting and verifying the pixel is set.
	// (2) Verifying the upper layers. The color is blended and applied to the upper layers.
	// (3) Verifying termination of the bubbling process. Blocks are not created when the alpha diminishes to zero.

	// Base coords = arbitrarily deep location
	baseCoords := coordsFromBits("0000 0000 0000 0000 0000 10", "0000 0000 0000 0000 0000 10")
	coords1 := baseCoords.Down(0, 0)
	coords2 := baseCoords.Down(0, 1)
	coords3 := baseCoords.Down(1, 0)
	coords4 := baseCoords.Down(1, 1)

	blue := Color(0xF00)
	red := Color(0x00F)

	/////////////////////////////////////////////////////////////////
	// (1.1) Setting 1 pixel
	repo.SetPixel(coords1, blue)
	block, err := repo.GetBlock(coords1.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(int(blue)<<16)|PIXEL_SET, block.Pixels[coords1.PixelIndex()])

	// Note that it doesn't matter which coords we call Up(1)
	// on. They all go up to the same parent.
	// (1.2) Checking color of upper layer
	block, err = repo.GetBlock(coords1.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(blue)|(3<<12), block.Pixels[coords1.Up(1).PixelIndex()])

	// (1.3) termination
	block, err = repo.GetBlock(coords1.Up(2).ParentOfPixel())
	assert.Error(t, ErrBlockNotFound, err) // Bubble stops since alpha is zero.
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (2.1) Setting 2 pixels - increases alpha of upper layers.
	repo.SetPixel(coords2, blue)
	block, err = repo.GetBlock(coords2.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(int(blue)<<16)|PIXEL_SET, block.Pixels[coords2.PixelIndex()])

	// (2.2) Alpha is increased to half since 2/4 pixels are set.
	block, err = repo.GetBlock(coords2.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(blue)|(7<<12), block.Pixels[coords2.Up(1).PixelIndex()])

	// (2.2) Another layer is affected since alpha hasn't reached zero yet.
	// 15\2 = 7, 7\4 = 1
	block, err = repo.GetBlock(coords2.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(blue)|(1<<12), block.Pixels[coords2.Up(2).PixelIndex()])

	// (2.3) Termination
	block, err = repo.GetBlock(coords2.Up(3).ParentOfPixel())
	assert.Error(t, ErrBlockNotFound, err) // Bubble stops since alpha is zero.
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (3.1) Setting 3 pixels
	repo.SetPixel(coords3, red)
	block, err = repo.GetBlock(coords3.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(int(red)<<16)|PIXEL_SET, block.Pixels[coords3.PixelIndex()])

	// (3.2) Upper layer 1, color is mixed: 2 blues + 1 red
	block, err = repo.GetBlock(coords3.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	mixed := mixColors(red, blue, blue)
	assert.EqualValues(t, Pixel(mixed)|(11<<12), block.Pixels[coords3.Up(1).PixelIndex()])

	// (3.2) Upper layer 2
	block, err = repo.GetBlock(coords3.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(mixed)|(2<<12), block.Pixels[coords3.Up(2).PixelIndex()])

	// (3.3) Termination past layer 2
	block, err = repo.GetBlock(coords3.Up(3).ParentOfPixel())
	assert.Error(t, ErrBlockNotFound, err)
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (4.1) And 4 pixels. This will be red*2 + blue*2 (mixed evenly)
	repo.SetPixel(coords4, red)
	block, err = repo.GetBlock(coords4.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(int(red)<<16)|PIXEL_SET, block.Pixels[coords4.PixelIndex()])

	// (4.2) upper layer, color is mixed evenly
	block, err = repo.GetBlock(coords4.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	mixed = mixColors(red, blue)
	// expect full alpha on upper pixel.
	assert.EqualValues(t, Pixel(mixed)|(15<<12), block.Pixels[coords4.Up(1).PixelIndex()])

	// (4.3) upper layer 2, alpha = 15\4
	block, err = repo.GetBlock(coords4.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, Pixel(mixed)|(3<<12), block.Pixels[coords4.Up(2).PixelIndex()])

	// (4.4) termination
	block, err = repo.GetBlock(coords4.Up(3).ParentOfPixel())
	assert.Error(t, ErrBlockNotFound, err)
	assert.Nil(t, block)

}

func getPixel(repo BlockRepo, coords Coords) (Pixel, error) {
	block, err := repo.GetBlock(coords.ParentOfPixel())
	if err != nil {
		return 0, err
	}
	return block.Pixels[coords.PixelIndex()], nil
}

func digCoords(coords Coords, x, y, bits int) Coords {
	for i := bits - 1; i >= 0; i-- {
		coords = coords.Down(uint8((x>>i)&1), uint8((y>>i)&1))
	}
	return coords
}

func TestMemBlockBubble2(t *testing.T) {

	// For this test, we're generating a random image and then painting it at 8x resolution.
	// Then we read the data from the upper layers at a smaller scale to verify that the
	// pixels are bubbled and shrunk accordingly.
	// No complex blending testing here, just 1:1 pixel replication.

	var pixelData [100 * 100]Color
	for i := range pixelData {
		pixelData[i] = Color(rand.Intn(0x1000))
	}

	clock := clock.CreateTestClockService().(*clock.TestClockService)
	repo := CreateMemBlockRepo(clock)

	// Some random and deep coordinate.
	baseCoords := coordsFromBits(fmt.Sprintf("%20b", rand.Intn(1<<20)), fmt.Sprintf("%20b", rand.Intn(1<<20)))

	// Paint the random pixels at x8 scale.
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			for px := 0; px < 8; px++ {
				for py := 0; py < 8; py++ {
					pcoords := digCoords(baseCoords, x, y, 7)
					pcoords = digCoords(pcoords, px, py, 3)
					repo.SetPixel(pcoords, pixelData[x+y*100])
				}
			}
		}
	}

	// Then verify at higher levels that the image is the same.
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			// Up 1 level
			for px := 0; px < 4; px++ {
				for py := 0; py < 4; py++ {
					pcoords := digCoords(baseCoords, x, y, 7)
					pcoords = digCoords(pcoords, px, py, 2)
					pixel, err := getPixel(repo, pcoords)
					assert.NoError(t, err)
					assert.EqualValues(t, pixelData[x+y*100]|0xF000, pixel&0xFFFF)
				}
			}

			// Up 2 levels
			for px := 0; px < 2; px++ {
				for py := 0; py < 2; py++ {
					pcoords := digCoords(baseCoords, x, y, 7)
					pcoords = digCoords(pcoords, px, py, 1)
					pixel, err := getPixel(repo, pcoords)
					assert.NoError(t, err)
					assert.EqualValues(t, pixelData[x+y*100]|0xF000, pixel&0xFFFF)
				}
			}

			// Up 3 levels
			pcoords := digCoords(baseCoords, x, y, 7)
			pixel, err := getPixel(repo, pcoords)
			assert.NoError(t, err)
			assert.EqualValues(t, pixelData[x+y*100]|0xF000, pixel&0xFFFF)

		}
	}

}

func TestMemBlockBubble3(t *testing.T) {

	// For this experiment we'll have 3 layers.
	// (1) Set layer 3 to 2/4 pixels of red.
	// (2) Set layer 2 pixel to blue.
	// (3) Verify that layer 1 contains red and blue mixed evenly at 1/4 alpha.
	//
	// Layer 3 will blend layer 2 halfway towards red with the 2/4 pixels set, and that
	// bubbles into layer 1 with 1/4 alpha.

	clock := clock.CreateTestClockService().(*clock.TestClockService)
	repo := CreateMemBlockRepo(clock)

	repo.SetPixel(coordsFromBits("00000000 00", "00000000 00"), Color(0x00F))
	repo.SetPixel(coordsFromBits("00000000 01", "00000000 01"), Color(0x00F))

	repo.SetPixel(coordsFromBits("00000000 0", "00000000 0"), Color(0xF00))

	pixel, err := getPixel(repo, coordsFromBits("00000000", "00000000"))
	assert.NoError(t, err)

	// This is a messy test since it depends on rounding errors.
	// In the future we might change the alpha channel to have an exact middle?
	assert.EqualValues(t, Pixel(0x00003807), pixel&0xFFFF)

}

func TestMemBlockDrying(t *testing.T) {

	//////////////////////////////////////////////////////////////////////////
	// After a set time period, set pixels will "dry" and cannot be repainted.

	{
		clock := clock.CreateTestClockService().(*clock.TestClockService)
		repo := CreateMemBlockRepo(clock)

		clock.Advance(time.Hour)
		repo.SetPixel(coordsFromBits("00000000 00", "00000000 00"), Color(0x00F))
		clock.Advance(time.Hour)
		err := repo.SetPixel(coordsFromBits("00000000 00", "00000000 00"), Color(0x00F))
		assert.ErrorIs(t, err, ErrPixelIsDry)
	}

	// In addition, covered pixels cannot be repainted. "Covered" is a state when the
	// pixel is overwritten completely by lower layers (inherited alpha = 15/15).
	// This is also treated as a "dry" error, even though it is not from any time period.

	{
		clock := clock.CreateTestClockService().(*clock.TestClockService)
		repo := CreateMemBlockRepo(clock)

		clock.Advance(time.Hour)
		repo.SetPixel(coordsFromBits("00000000 000", "00000000 000"), Color(0x00F))
		repo.SetPixel(coordsFromBits("00000000 001", "00000000 000"), Color(0x00F))
		repo.SetPixel(coordsFromBits("00000000 000", "00000000 001"), Color(0x00F))
		repo.SetPixel(coordsFromBits("00000000 001", "00000000 001"), Color(0x00F))
		err := repo.SetPixel(coordsFromBits("00000000 00", "00000000 00"), Color(0x00F))
		assert.ErrorIs(t, err, ErrPixelIsDry)
	}

}
