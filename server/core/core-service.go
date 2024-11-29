package core

import (
	"go.mukunda.com/nanopaint/core/block2"
	"go.mukunda.com/nanopaint/core/clock"
)

type CoreIntervals interface{}

type coreIntervals struct{}

func CreateCoreIntervals(config *coreConfig, clock clock.ClockService, blocks block2.BlockRepo) CoreIntervals {
	// if !config.disableBlockDryInterval {
	// 	clock.StartInterval(time.Millisecond*time.Duration(config.blockDryInterval),
	// 		func() {
	// 			blocks.DryPixels()
	// 		})
	// }
	return &coreIntervals{}
}
