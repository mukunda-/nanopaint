// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"encoding/base64"
	"regexp"

	"go.mukunda.com/nanopaint/cat"
	"go.mukunda.com/nanopaint/core"
)

type BlockController interface {
	GetBlock(c Ct) error
	SetBlock(c Ct) error
}

type blockController struct {
	blocks core.BlockService
}

var reValidCoords = regexp.MustCompile(`^[0-9A-Za-z_-]*$`)

// ---------------------------------------------------------------------------------------
func CreatePaintController(routes Router, blocks core.BlockService, hs HttpService) BlockController {
	pc := &blockController{
		blocks: blocks,
	}

	// Double route since we also want to include the empty string as valid coords.
	routes.GET("/api/block/:coords", pc.GetBlock, hs.UseRateLimiter())
	routes.GET("/api/block/", pc.GetBlock, hs.UseRateLimiter())

	// The empty string is not valid for POST, but we still want to customize the error
	// message (should be 400, not 404).
	routes.POST("/api/block/:coords", pc.SetBlock, hs.UseRateLimiter())
	routes.POST("/api/block/", pc.SetBlock, hs.UseRateLimiter())

	return &blockController{}
}

// ---------------------------------------------------------------------------------------
func encodePixels(pixels []core.Pixel) string {
	byteArray := make([]byte, len(pixels)*4)
	for i, pixel := range pixels {
		s := i * 4
		byteArray[s] = byte(pixel)
		byteArray[s+1] = byte(pixel >> 8)
		byteArray[s+2] = byte(pixel >> 16)
		byteArray[s+3] = byte(pixel >> 24)
	}

	return base64.StdEncoding.EncodeToString(byteArray)
}

// ---------------------------------------------------------------------------------------
func (pc *blockController) GetBlock(c Ct) error {
	coordsString := c.Param("coords")
	cat.BadIf(!reValidCoords.MatchString(coordsString), "Invalid coordinates.")

	coords := core.CoordsFromString(coordsString)
	block, err := pc.blocks.GetBlock(coords)
	cat.NotFoundIf(err == core.ErrBlockNotFound, "Block not found.")
	if err != nil {
		panic("unexpected error from core.GetBlock")
	}

	var response struct {
		baseResponse

		Pixels string `json:"pixels"`
	}

	response.Code = "BLOCK"
	response.Pixels = encodePixels(block.Pixels[:])

	return c.JSON(200, response)
}

// ---------------------------------------------------------------------------------------
func (pc *blockController) SetBlock(c Ct) error {
	return c.JSON(501, "not implemented")
}
