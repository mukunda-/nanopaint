// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package main

import (
	"go.mukunda.com/nanopaint/api"
	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core"
	"go.mukunda.com/nanopaint/core/clock"
	"go.uber.org/fx"
)

// ---------------------------------------------------------------------------------------
// Just an entry point. We'll keep this file minimal.
func main() {
	fx.New(
		config.ProvideFromYamlString(``),
		fx.Provide(clock.CreateSystemClockService),
		core.Fx(),
		api.Fx(),
	).Run()
}
