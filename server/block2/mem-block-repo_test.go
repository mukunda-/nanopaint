package block2_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mukunda.com/nanopaint/block2"
	"go.mukunda.com/nanopaint/core"
)

func coordsFromBits(x, y string) block2.Coords {
	x = strings.ReplaceAll(x, " ", "")
	y = strings.ReplaceAll(y, " ", "")
	if len(x) != len(y) {
		panic("unequal coords components")
	}
	coords := block2.MakeEmptyCoords()
	for i := 0; i < len(x); i++ {
		bx := x[i] - '0'
		by := y[i] - '0'
		coords = coords.Down(bx, by)
	}
	return coords
}

func mixColors(colors ...block2.Color) block2.Color {
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

	return block2.Color((b << 8) | (g << 4) | r)
}

func TestMemBlockRepoBubbling(t *testing.T) {
	clock := core.CreateTestClockService().(*core.TestClockService)
	repo := block2.CreateMemBlockRepo(clock)

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

	blue := block2.Color(0xF00)
	red := block2.Color(0x00F)

	/////////////////////////////////////////////////////////////////
	// (1.1) Setting 1 pixel
	repo.SetPixel(coords1, blue)
	block, err := repo.GetBlock(coords1.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(int(blue)<<16)|block2.PIXEL_SET, block.Pixels[coords1.PixelIndex()])

	// Note that it doesn't matter which coords we call Up(1)
	// on. They all go up to the same parent.
	// (1.2) Checking color of upper layer
	block, err = repo.GetBlock(coords1.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(blue)|(3<<12), block.Pixels[coords1.Up(1).PixelIndex()])

	// (1.3) termination
	block, err = repo.GetBlock(coords1.Up(2).ParentOfPixel())
	assert.Error(t, block2.ErrBlockNotFound, err) // Bubble stops since alpha is zero.
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (2.1) Setting 2 pixels - increases alpha of upper layers.
	repo.SetPixel(coords2, blue)
	block, err = repo.GetBlock(coords2.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(int(blue)<<16)|block2.PIXEL_SET, block.Pixels[coords2.PixelIndex()])

	// (2.2) Alpha is increased to half since 2/4 pixels are set.
	block, err = repo.GetBlock(coords2.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(blue)|(7<<12), block.Pixels[coords2.Up(1).PixelIndex()])

	// (2.2) Another layer is affected since alpha hasn't reached zero yet.
	// 15\2 = 7, 7\4 = 1
	block, err = repo.GetBlock(coords2.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(blue)|(1<<12), block.Pixels[coords2.Up(2).PixelIndex()])

	// (2.3) Termination
	block, err = repo.GetBlock(coords2.Up(3).ParentOfPixel())
	assert.Error(t, block2.ErrBlockNotFound, err) // Bubble stops since alpha is zero.
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (3.1) Setting 3 pixels
	repo.SetPixel(coords3, red)
	block, err = repo.GetBlock(coords3.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(int(red)<<16)|block2.PIXEL_SET, block.Pixels[coords3.PixelIndex()])

	// (3.2) Upper layer 1, color is mixed: 2 blues + 1 red
	block, err = repo.GetBlock(coords3.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	mixed := mixColors(red, blue, blue)
	assert.EqualValues(t, block2.Pixel(mixed)|(11<<12), block.Pixels[coords3.Up(1).PixelIndex()])

	// (3.2) Upper layer 2
	block, err = repo.GetBlock(coords3.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(mixed)|(2<<12), block.Pixels[coords3.Up(2).PixelIndex()])

	// (3.3) Termination past layer 2
	block, err = repo.GetBlock(coords3.Up(3).ParentOfPixel())
	assert.Error(t, block2.ErrBlockNotFound, err)
	assert.Nil(t, block)

	/////////////////////////////////////////////////////////////////
	// (4.1) And 4 pixels. This will be red*2 + blue*2 (mixed evenly)
	repo.SetPixel(coords4, red)
	block, err = repo.GetBlock(coords4.ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(int(red)<<16)|block2.PIXEL_SET, block.Pixels[coords4.PixelIndex()])

	// (4.2) upper layer, color is mixed evenly
	block, err = repo.GetBlock(coords4.Up(1).ParentOfPixel())
	assert.NoError(t, err)
	mixed = mixColors(red, blue)
	// expect full alpha on upper pixel.
	assert.EqualValues(t, block2.Pixel(mixed)|(15<<12), block.Pixels[coords4.Up(1).PixelIndex()])

	// (4.3) upper layer 2, alpha = 15\4
	block, err = repo.GetBlock(coords4.Up(2).ParentOfPixel())
	assert.NoError(t, err)
	assert.EqualValues(t, block2.Pixel(mixed)|(3<<12), block.Pixels[coords4.Up(2).PixelIndex()])

	// (4.4) termination
	block, err = repo.GetBlock(coords4.Up(3).ParentOfPixel())
	assert.Error(t, block2.ErrBlockNotFound, err)
	assert.Nil(t, block)

}
