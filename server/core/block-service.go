// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"go.mukunda.com/nanopaint/cat"
	"go.mukunda.com/nanopaint/core/block2"
)

type (
	BlockService interface {
		GetBlock(coords block2.Coords) (*block2.Block, error)
		SetPixel(coords block2.Coords, color block2.Color) error
	}

	blockService struct {
		repo block2.BlockRepo
	}
)

func CreateBlockService(repo block2.BlockRepo) BlockService {
	return &blockService{
		repo: repo,
	}
}

// ---------------------------------------------------------------------------------------
// Returns a block or ErrBlockNotFound if the coordinates are invalid.
// Other errors are panics.
func (s *blockService) GetBlock(coords block2.Coords) (*block2.Block, error) {
	block, err := s.repo.GetBlock(coords)
	if err != nil {
		if err == block2.ErrBlockNotFound {
			return nil, err
		}
		cat.Catch(err, "Failed to get block.")
	}
	return block, nil
}

// ---------------------------------------------------------------------------------------
// Creates a new block or updates a wet block.
//
// Errors:
//
//	ErrBlockNotFound: the parent doesn't exist.
//	ErrBlockIsDry: the block is already dry and cannot be updated.
func (s *blockService) SetPixel(coords block2.Coords, color block2.Color) error {
	err := s.repo.SetPixel(coords, color)
	if err == block2.ErrPixelIsDry || err == block2.ErrMaxDepthExceeded {
		// Filter for these error types only. Others panic.
		return err
	}
	cat.Catch(err, "Failed to set block.")

	return nil
}
