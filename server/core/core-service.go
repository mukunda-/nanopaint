package core

import (
	"time"

	"go.mukunda.com/nanopaint/clock"
)

type CoreIntervals interface{}

type coreIntervals struct{}

func CreateCoreIntervals(config *coreConfig, clock clock.ClockService, blocks BlockRepo) CoreIntervals {
	if !config.disableBlockDryInterval {
		clock.StartInterval(time.Millisecond*time.Duration(config.blockDryInterval),
			func() {
				blocks.DryPixels()
			})
	}
	return &coreIntervals{}
}
