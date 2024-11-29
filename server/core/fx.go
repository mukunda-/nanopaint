// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

import (
	"go.mukunda.com/nanopaint/clock"
	"go.mukunda.com/nanopaint/config"
	"go.uber.org/fx"
)

var defaultCoreConfig = coreConfig{
	storageType:             "mem",
	blockDryInterval:        1000,
	disableBlockDryInterval: false,
}

// ---------------------------------------------------------------------------------------
func createBlockRepo(config *coreConfig, clock clock.ClockService) BlockRepo {

	if config.storageType == "mem" {
		return CreateMemBlockRepo(clock)
	} else {
		panic("unknown block storage type")
	}
}

// ---------------------------------------------------------------------------------------
func createCoreConfig(config config.Config) *coreConfig {
	cc := coreConfig{}
	cc = defaultCoreConfig
	config.Load("core", &cc)
	return &cc
}

// ---------------------------------------------------------------------------------------
func Fx() fx.Option {
	return fx.Options(
		fx.Provide(
			createCoreConfig,
			createBlockRepo,
			CreateBlockService,
			CreateCoreIntervals,
		),
		fx.Invoke(func(CoreIntervals) {}),
	)
}
