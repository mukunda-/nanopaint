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
	"go.mukunda.com/nanopaint/core/block2"
)

type PaintController interface {
	GetBlock(c Ct) error
	Paint(c Ct) error
}

type paintController struct {
	blocks core.BlockService
}

var reValidCoords = regexp.MustCompile(`^[0-9A-Za-z_-]*$`)
var reValidColor = regexp.MustCompile(`^[a-fA-F0-9]{3}$`)

// ---------------------------------------------------------------------------------------
func CreatePaintController(routes Router, blocks core.BlockService, hs HttpService) PaintController {
	pc := &paintController{
		blocks: blocks,
	}

	// Double route since we also want to include the empty string as valid coords.
	routes.GET("/api/block/:coords", pc.GetBlock, hs.UseRateLimiter())
	routes.GET("/api/block/", pc.GetBlock, hs.UseRateLimiter())

	routes.POST("/api/paint/:coords", pc.Paint, hs.UseRateLimiter())
	// The empty string is not valid for POST, but we still want to customize the error
	// message (should be 400, not 404).
	routes.POST("/api/paint/", pc.Paint, hs.UseRateLimiter())

	return &paintController{}
}

// ---------------------------------------------------------------------------------------
func encodePixels(pixels []block2.Pixel) string {
	byteArray := make([]byte, len(pixels)*4)
	for i, pixel := range pixels {
		s := i * 4
		byteArray[s] = byte(pixel)
		byteArray[s+1] = byte(pixel >> 8)
		byteArray[s+2] = byte(pixel >> 16)
		byteArray[s+3] = byte(pixel >> 24)
	}

	return base64.URLEncoding.EncodeToString(byteArray)
}

// ---------------------------------------------------------------------------------------
func catchInvalidCoords(coords string) {
	cat.BadIf(!reValidCoords.MatchString(coords), "Invalid coordinate string.")
}

// ---------------------------------------------------------------------------------------
func catchMissingField(fieldName, value string) {
	cat.BadIf(value == "", "`body."+fieldName+"` is missing.")
}

// ---------------------------------------------------------------------------------------
func parseColor(color string) block2.Color {
	cat.BadIf(!reValidColor.MatchString(color), "Invalid color. Must be 3 hex digits `rgb`.")
	// convert color from a RRGGBB string to a 32-bit integer
	result, err := strconv.ParseInt(color, 16, 32)
	cat.Catch(err, "Unexpected parse failure in api.parseColor.")

	r := (result & 0xF00) >> 8
	g := (result & 0xF0) >> 4
	b := result & 0xF

	return block2.Color(r | g<<4 | b<<8)
}

// ---------------------------------------------------------------------------------------
func (pc *paintController) GetBlock(c Ct) error {
	coordsString := c.Param("coords")
	coords := block2.CoordsFromBase64(coordsString)

	block, err := pc.blocks.GetBlock(coords)
	cat.NotFoundIf(err == block2.ErrBlockNotFound, "Block not found.")
	cat.Catch(err, "unexpected error from core.GetBlock")

	var response struct {
		baseResponse

		Pixels      string            `json:"pixels"`
		LastUpdated block2.UnixMillis `json:"lastUpdated"`
	}

	response.Code = "BLOCK"
	response.Pixels = encodePixels(block.Pixels[:])
	response.LastUpdated = block.LastUpdated

	return c.JSON(200, response)
}

type paintInput struct {
	Color string `json:"color"`
}

// ---------------------------------------------------------------------------------------
func (pc *paintController) Paint(c Ct) error {
	var body paintInput
	c.Bind(&body)
	catchMissingField("color", body.Color)

	coordsString := c.Param("coords")

	coords := block2.CoordsFromBase64(coordsString)

	err := pc.blocks.SetPixel(coords, parseColor(body.Color))
	if err == block2.ErrPixelIsDry {
		return c.JSON(400, baseResponse{
			Code:    "PIXEL_DRY",
			Message: "Pixel is dry and cannot be updated.",
		})
		// } else if err == core.ErrBlockParentNotDry {
		// 	return c.JSON(400, baseResponse{
		// 		Code:    "BLOCK_PARENT_NOT_DRY",
		// 		Message: "Parent block is not dry.",
		// 	})
	} else if err == block2.ErrMaxDepthExceeded {
		return c.JSON(400, baseResponse{
			Code:    "MAX_DEPTH_EXCEEDED",
			Message: "Max depth exceeded.",
		})
	}
	cat.Catch(err, "Failed to set pixel.")

	return c.JSON(200, baseResponse{
		Code: "PIXEL_SET",
	})
}
