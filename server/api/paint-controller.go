// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"regexp"

	"go.mukunda.com/nanopaint/cat"
	"go.mukunda.com/nanopaint/core"
)

type PaintController interface {
	GetBlock(c Ct) error
	SetPixel(c Ct) error
}

type paintController struct {
	blocks core.BlockService
}

var reValidCoords = regexp.MustCompile(`[0-9A-Za-z_-]*`)

// ---------------------------------------------------------------------------------------
func CreatePaintController(routes Router, blocks core.BlockService, hs HttpService) PaintController {
	pc := &paintController{
		blocks: blocks,
	}

	routes.GET("/api/block/:coords", pc.GetBlock, hs.UseRateLimiter())
	routes.POST("/api/pixel/:coords", pc.SetPixel, hs.UseRateLimiter())

	return &paintController{}
}

// ---------------------------------------------------------------------------------------
func (pc *paintController) GetBlock(c Ct) error {
	coords := c.Param("coords")
	cat.BadIf(!reValidCoords.MatchString(coords), "Invalid coordinates.")

	//return pc.blocks.GetBlock(

	return c.JSON(501, "not implemented")
}

// ---------------------------------------------------------------------------------------
func (pc *paintController) SetPixel(c Ct) error {
	return c.JSON(501, "not implemented")
}
