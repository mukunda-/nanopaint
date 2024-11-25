// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"encoding/base64"
	"regexp"
	"strconv"

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
var reValidColor = regexp.MustCompile(`^[a-fA-F0-9]{6}$`)

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
func catchInvalidCoords(coords string) {
	cat.BadIf(!reValidCoords.MatchString(coords), "Invalid coordinates.")
}

// ---------------------------------------------------------------------------------------
func catchMissingField(fieldName, value string) {
	cat.BadIf(value == "", "`body."+fieldName+"` is missing.")
}

// ---------------------------------------------------------------------------------------
func parseColor(color string) core.Color {
	cat.BadIf(!reValidColor.MatchString(color), "Invalid color. Must be in the format RRGGBB.")
	// convert color from a RRGGBB string to a 32-bit integer
	result, err := strconv.ParseInt(color, 16, 32)
	if err != nil {
		panic("unexpected strconv error in parseColor")
	}
	return core.Color(result)
}

// ---------------------------------------------------------------------------------------
func (pc *blockController) GetBlock(c Ct) error {
	coordsString := c.Param("coords")
	catchInvalidCoords(coordsString)

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
	var body struct {
		Color string `json:"color"`
	}
	c.Bind(&body)
	catchMissingField("color", body.Color)

	coordsString := c.Param("coords")
	catchInvalidCoords(coordsString)

	coords := core.CoordsFromString(coordsString)
	err := pc.blocks.SetBlock(coords, parseColor(body.Color))
	cat.NotFoundIf(err == core.ErrBlockNotFound, "Block not found.")
	if err == core.ErrBlockIsDry {
		return c.JSON(400, baseResponse{
			Code:    "BLOCK_DRY",
			Message: "Block is dry.",
		})
		// } else if err == core.ErrBlockParentNotDry {
		// 	return c.JSON(400, baseResponse{
		// 		Code:    "BLOCK_PARENT_NOT_DRY",
		// 		Message: "Parent block is not dry.",
		// 	})
	}
	cat.Catch(err, "Failed to set block.")

	return c.JSON(200, baseResponse{
		Code: "BLOCK_SET",
	})
}
