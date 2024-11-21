// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import "go.mukunda.com/nanopaint/core"

type PixelsController interface {
	GetBlock(c Ct) error
	SetPixel(c Ct) error
}

type pixelsController struct {
	blocks core.BlockService
}

// ---------------------------------------------------------------------------------------
func CreatePixelsController(routes Router, blocks core.BlockService) PixelsController {
	pc := &pixelsController{
		blocks: blocks,
	}
	routes.GET("/api/block/:coords", func(c Ct) error { return pc.GetBlock(c) })
	routes.POST("/api/pixel/:coords", func(c Ct) error { return pc.SetPixel(c) })

	return &pixelsController{}
}

// ---------------------------------------------------------------------------------------
func (pc *pixelsController) GetBlock(c Ct) error {

	return c.JSON(501, "not implemented")
}

// ---------------------------------------------------------------------------------------
func (pc *pixelsController) SetPixel(c Ct) error {
	return c.JSON(501, "not implemented")
}
