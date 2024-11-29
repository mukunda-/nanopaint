package block2

import (
	"fmt"
	"sync"
	"time"

	"go.mukunda.com/nanopaint/cat"
)

// A block repository that doesn't use persistent storage (in-memory). For testing.
// Single threaded. Not thread safe.

// ---------------------------------------------------------------------------------------
type ClockService interface {
	Now() time.Time
}

type UnixMillis = int64

// ---------------------------------------------------------------------------------------
type (
	MemBlock struct {
		Pixels  []Pixel
		DryTime UnixMillis
	}

	MemBlockRepo struct {
		Clock  ClockService
		Blocks map[string]*MemBlock
		mutex  sync.Mutex
	}
)

// ---------------------------------------------------------------------------------------
func CreateMemBlockRepo(cs ClockService) BlockRepo {
	blocks := make(map[string]*MemBlock)
	return &MemBlockRepo{
		Clock:  cs,
		Blocks: blocks,
	}
}

// ---------------------------------------------------------------------------------------
// This is called when we load the block. When the dry time expires, any pending pixels
// are dried.
func (r *MemBlockRepo) dryBlock(block *MemBlock) {
	cat.EnsureLocked(&r.mutex)

	if block.DryTime > 0 && r.Clock.Now().UnixMilli() >= block.DryTime {
		block.DryTime = 0
		for i := range block.Pixels {
			if block.Pixels[i]&PIXEL_SET != 0 {
				block.Pixels[i] |= PIXEL_DRY
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) GetBlock(coords Coords) (*Block, error) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	block, ok := r.Blocks[string(coords.ToBytes())]
	if !ok {
		return nil, ErrBlockNotFound
	}

	r.dryBlock(block)
	return &Block{
		Pixels: block.Pixels,
	}, nil
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) getOrCreateBlock(coords Coords) *MemBlock {
	cat.EnsureLocked(&r.mutex)

	block, ok := r.Blocks[string(coords.ToBytes())]
	if !ok {
		block = &MemBlock{
			Pixels: make([]Pixel, 64*64),
		}
		r.Blocks[string(coords.ToBytes())] = block
	}
	return block
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) bubbleColor(coords Coords) {
	cat.EnsureLocked(&r.mutex)

	if coords.BitLength() <= 6 {
		return // At the top level.
	}
	blockCoords := coords.ParentOfPixel()
	block := r.getOrCreateBlock(blockCoords)

	// Gather 4 pixels
	pixelIndex := coords.PixelIndex()
	pixelIndex &= 0o7676

	sum_r := 0
	sum_g := 0
	sum_b := 0
	sum_a := 0

	for py := 0; py < 2; py++ {
		for px := 0; px < 2; px++ {
			index := pixelIndex + py*64 + px
			pixelData := block.Pixels[index]
			if pixelData&PIXEL_SET != 0 {

				painted := int((pixelData >> 16) & 0xFFF)
				inherited := int((pixelData) & 0xFFFF)
				alpha2 := inherited >> 12
				alpha1 := 15 - alpha2

				sum_a += 15
				sum_r += (painted&0xF)*alpha1 + (inherited&0xF)*alpha2
				sum_g += ((painted>>4)&0xF)*alpha1 + ((inherited>>4)&0xF)*alpha2
				sum_b += ((painted>>8)&0xF)*alpha1 + ((inherited>>8)&0xF)*alpha2
			} else {
				// inherited only
				if pixelData&0xF000 == 0 {
					// Nothing inherited (alpha is zero). This will be treated like a
					// transparent spot and lower the alpha.
					continue
				}
				inherited := int(pixelData & 0xFFFF)
				alpha := inherited >> 12
				sum_a += alpha
				sum_r += (inherited & 0xF) * alpha
				sum_g += ((inherited >> 4) & 0xF) * alpha
				sum_b += ((inherited >> 8) & 0xF) * alpha
			}
		}
	}

	sum_r = (sum_r + (sum_a >> 1)) / sum_a
	sum_g = (sum_g + (sum_a >> 1)) / sum_a
	sum_b = (sum_b + (sum_a >> 1)) / sum_a
	sum_a /= 4

	if sum_a == 0 {
		return // Nothing more to bubble.
	}

	computed := sum_r | (sum_g << 4) | (sum_b << 8) | (sum_a << 12)

	coords = coords.Up(1)
	upperBlockCoords := coords.ParentOfPixel()
	upperBlock := r.getOrCreateBlock(upperBlockCoords)
	upperPixelIndex := coords.PixelIndex()

	upperPixelValue := upperBlock.Pixels[upperPixelIndex]
	if int(upperPixelValue&0xFFFF) == computed {
		return // No change, stop the bubble.
	}
	upperBlock.Pixels[upperPixelIndex] = (upperPixelValue & 0xFFFF0000) | Pixel(computed)

	r.bubbleColor(coords)
}

// ---------------------------------------------------------------------------------------
func (r *MemBlockRepo) SetPixel(coords Coords, color Color) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	blockCoords := coords.ParentOfPixel()
	block := r.getOrCreateBlock(blockCoords)
	r.dryBlock(block)

	pixelIndex := coords.PixelIndex()

	if block.Pixels[pixelIndex]&PIXEL_DRY != 0 {
		return ErrBlockIsDry
	}

	// Mask out existing color.
	pixelValue := block.Pixels[pixelIndex] & 0xF000FFFF

	// Set new color.
	pixelValue |= Pixel(color) << 16
	pixelValue |= PIXEL_SET

	block.Pixels[pixelIndex] = pixelValue

	block.DryTime = r.Clock.Now().UnixMilli() + 5000 // Debug. This is computed by layer
	coords2 := coords
	fmt.Println(coords2)
	r.bubbleColor(coords)

	return nil
}
