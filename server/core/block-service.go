// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "go.mukunda.com/nanopaint/cat"

type (
	BlockService interface {
		GetBlock(coords Coords) (*Block, error)
		SetBlock(coords Coords, color Color) error
	}

	blockService struct {
		repo BlockRepo
	}
)

func CreateBlockService(repo BlockRepo) BlockService {
	return &blockService{
		repo: repo,
	}
}

// ---------------------------------------------------------------------------------------
// Returns a block or ErrBlockNotFound if the coordinates are invalid.
// Other errors are panics.
func (s *blockService) GetBlock(coords Coords) (*Block, error) {
	block, err := s.repo.GetBlock(coords)
	if err != nil {
		if err == ErrBlockNotFound {
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
func (s *blockService) SetBlock(coords Coords, color Color) error {
	err := s.repo.SetBlock(coords, color)
	if err == ErrBlockNotFound || err == ErrBlockIsDry {
		// Filter for these error types only. Others panic.
		return err
	}
	cat.Catch(err, "Failed to set block.")

	return nil
}
