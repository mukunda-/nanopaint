// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

// A block repository that doesn't use persistent storage (in-memory). For testing.
// Single threaded. Not thread safe.

// ---------------------------------------------------------------------------------------
type (
	MemBlockRepo struct {
		Clock   ClockService
		Blocks  map[string]*Block
		DryTime map[string]int64
	}
)

// ---------------------------------------------------------------------------------------
func CreateMemBlockRepo(cs ClockService) BlockRepo {
	blocks := make(map[string]*Block)
	blocks[""] = &Block{}
	return &MemBlockRepo{
		Clock:  cs,
		Blocks: blocks,
	}
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) GetBlock(coords BlockCoords) (*Block, error) {
	block, ok := r.Blocks[coords.ToString()]
	if !ok {
		return &Block{}, ErrBlockNotFound
	}
	return block, nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) bubbleColor(coords BlockCoords) {
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
		parent.Pixels[pixelCoords] = Pixel{
			Color: average,
			Dry:   true,
		}

		coords = parentCoords
		block = parent
	}
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) SetPixel(coords BlockCoords, color Color) error {
	if len(coords) == 0 {
		return ErrBadCoords
	}

	parentCoords := coords.Parent()
	parent, err := r.GetBlock(parentCoords)
	if err == ErrBlockNotFound {
		return ErrBadCoords
	} else if err != nil {
		return err
	}

	pixelCoord := coords[len(coords)-1]
	if parent.Pixels[pixelCoord].Dry {
		return ErrPixelIsDry
	}

	parent.Pixels[pixelCoord] = Pixel{
		Color: color,
		Dry:   false,
	}
	r.DryTime[coords.ToString()] = r.Clock.Now().Unix()

	r.bubbleColor(parentCoords)

	return nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) DryPixels() {
	for index, dryTime := range r.DryTime {
		coords := CoordsFromString(index)
		if r.Clock.Now().Unix()-dryTime > int64(GetDryTime(coords)) {
			coords := CoordsFromString(index)
			block, err := r.GetBlock(coords)
			if err != nil {
				panic("block missing in tree")
			}

			for i := range block.Pixels {
				block.Pixels[i].Dry = true
			}

			// It is safe to delete during range for.
			delete(r.DryTime, index)
		}
	}
}
