// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import "go.uber.org/fx"

func Fx() fx.Option {
	return fx.Option(
		fx.Provide(
			CreateBlockService,
		),
		fx.Invoke(func() {
		}),
	)
}
