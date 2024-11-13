//////////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
//////////////////////////////////////////////////////////////////////////////////////////
package core

func TestBlockRepo(t *testing.T) {
	var repo BlockRepo
	app := fxtest.New(
		fx.Provide(CreateTestBlockRepo),
		fx.Invoke(func(prepo BlockRepo) {
			repo = prepo
		}),
	).RequireStart()

	defer app.RequireStop()

	// 
	repo.SetPixel(BlockCoords{0, 0}, Color{0, 0, 0})
}