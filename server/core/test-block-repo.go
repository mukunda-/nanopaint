//////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
//////////////////////////////////////////////////////////////////////////////////////////
package core

// A block repository that doesn't use persistent storage (in-memory). For testing.

type (
	TestBlockRepo struct {
		Blocks map[BlockCoords]Block
	}
)

func CreateTestBlockRepo() BlockRepo {
	return &TestBlockRepo{
		Blocks: make(map[BlockCoords]Block),
	}
}

func (r *TestBlockRepo) GetBlock(coords BlockCoords) (Block, error) {
	block, ok := r.Blocks[coords]
	if !ok {
		return Block{}, nil
	}
	return block, nil
}

