package core

import "go.mukunda.com/nanopaint/common"

var log = common.GetLogger("core")

type coreConfig struct {
	storageType             string
	blockDryInterval        int
	disableBlockDryInterval bool
}
