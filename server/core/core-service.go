package core

import "time"

type CoreIntervals interface{}

type coreIntervals struct{}

func CreateCoreIntervals(config *coreConfig, clock ClockService, blocks BlockRepo) CoreIntervals {
	if !config.disableBlockDryInterval {
		clock.StartInterval(time.Millisecond*time.Duration(config.blockDryInterval),
			func() {
				blocks.DryPixels()
			})
	}
	return &coreIntervals{}
}
