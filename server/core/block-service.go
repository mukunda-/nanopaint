// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

type (
	BlockService interface {
		GetBlock(coords BlockCoords) (Block, error)
		SetPixel(coords BlockCoords, color Color) error
	}

	dbBlockService struct{}
)

func CreateDbBlockService() BlockService {
	return &dbBlockService{}
}

func (s *dbBlockService) GetBlock(coords BlockCoords) (Block, error) {
	panic("not implemented")
}

func (s *dbBlockService) SetPixel(coords BlockCoords, color Color) error {
	panic("not implemented")
}
