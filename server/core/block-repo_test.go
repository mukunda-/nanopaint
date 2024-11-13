// ////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ////////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

func TestBlockRepo(t *testing.T) {
	var repo BlockRepo
	app := fxtest.New(t,
		fx.Provide(CreateMemBlockRepo),
		fx.Invoke(func(prepo BlockRepo) {
			repo = prepo
		}),
	).RequireStart()

	defer app.RequireStop()

	// Setting a pixel of a block that has no parent is an invalid operation.
	err := repo.SetPixel(BlockCoords{0, 0}, Color{0, 0, 0})
	assert.Error(t, err)
}
