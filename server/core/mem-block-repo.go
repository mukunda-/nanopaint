// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

/*
import (
	"fmt"

	"go.mukunda.com/nanopaint/core/clock"
)

// A block repository that doesn't use persistent storage (in-memory). For testing.
// Single threaded. Not thread safe.

// ---------------------------------------------------------------------------------------
type (
	MemBlockRepo struct {
		Clock   clock.ClockService
		Blocks  map[string]*Block
		DryTime map[string]int64
	}
)

// ---------------------------------------------------------------------------------------
func CreateMemBlockRepo(cs clock.ClockService) BlockRepo {
	log.Warnln(nil, "Using in-memory blockrepo. This implementation is for testing purposes and is not persisted.")
	log.WithField(nil, "clock", fmt.Sprintf("%T", cs)).
		Debugln("Creating MemBlockRepo")
	blocks := make(map[string]*Block)
	blocks[""] = &Block{}
	return &MemBlockRepo{
		Clock:   cs,
		Blocks:  blocks,
		DryTime: make(map[string]int64),
	}
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) GetBlock(coords Coords) (*Block, error) {
	block, ok := r.Blocks[coords.ToString()]
	if !ok {
		return nil, ErrBlockNotFound
	}
	return block, nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) bubbleColor(coords Coords) {
	if len(coords) == 0 {
		return
	}

	block, err := r.GetBlock(coords)
	if err != nil {
		panic("block missing in tree")
	}

	for len(coords) > 0 {
		average := block.GetAverage()

		parentCoords := coords.Parent()
		parent, err := r.GetBlock(parentCoords)
		if err != nil {
			panic("block missing in tree")
		}

		pixelCoords := coords[len(coords)-1]
		parent.Pixels[pixelCoords] = PIXEL_DRY | PIXEL_PAINTED | Pixel(average)

		coords = parentCoords
		block = parent
	}
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) getOrCreateBlock(coords Coords) (*Block, error) {
	block, err := r.GetBlock(coords)
	if err == ErrBlockNotFound {
		blockParent, err := r.GetBlock(coords.Parent())
		if err == ErrBlockNotFound {
			return nil, ErrBlockNotFound
		} else if err != nil {
			return nil, err
		}

		// Check if the parent pixel is dry.
		pixelCoord := coords[len(coords)-1]
		parentPixel := blockParent.Pixels[pixelCoord]
		if parentPixel&PIXEL_DRY != 0 {
			// If the parent pixel is dry, then we can create the block and save it.
			block = &Block{}
			r.Blocks[coords.ToString()] = block

			// Initialize the color to the parent pixel.
			for i := range block.Pixels {
				block.Pixels[i] = Pixel(parentPixel & PIXEL_COLOR_MASK)
			}
		} else {
			// Not dry yet.
			return nil, ErrBlockNotFound
		}
	} else if err != nil {
		return nil, err
	}

	return block, nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) SetBlock(coords Coords, color Color) error {
	if len(coords) == 0 {
		// The zero block is always dry.
		return ErrBlockIsDry
	}
	if Pixel(color)&PIXEL_FLAG_MASK != 0 {
		panic("invalid color value")
	}

	parentCoords := coords.Parent()
	parent, err := r.getOrCreateBlock(parentCoords)
	if err != nil {
		return err
	}

	pixelCoord := coords[len(coords)-1]
	if parent.Pixels[pixelCoord]&PIXEL_DRY != 0 {
		return ErrBlockIsDry
	}

	parent.Pixels[pixelCoord] = Pixel(color) | PIXEL_PAINTED
	r.DryTime[coords.ToString()] = r.Clock.Now().Unix()

	r.bubbleColor(parentCoords)

	return nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) DryPixels() {
	log.Debugln(nil, "Drying pixels.")

	for index, dryTime := range r.DryTime {
		coords := CoordsFromString(index)
		if r.Clock.Now().Unix()-dryTime >= int64(GetDryTime(coords)) {
			coords := CoordsFromString(index)
			block, err := r.GetBlock(coords.Parent())
			if err != nil {
				panic("block missing in tree")
			}

			log.Debugln(nil, "Dried: "+index)
			pixelCoord := coords[len(coords)-1]
			block.Pixels[pixelCoord] = block.Pixels[pixelCoord] | PIXEL_DRY

			// It is safe to delete during range for.
			delete(r.DryTime, index)
		}
	}
}
*/
