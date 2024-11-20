// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

type PixelsController interface {
	GetBlock(c Ct) error
	SetPixel(c Ct) error
}

type pixelsController struct{}

func CreatePixelsController(routes Router) PixelsController {
	//pc := &pixelsController{}
	return &pixelsController{}
}

func (pc *pixelsController) GetBlock(c Ct) error {
	return c.JSON(501, "not implemented")
}

func (pc *pixelsController) SetPixel(c Ct) error {
	return c.JSON(501, "not implemented")
}
