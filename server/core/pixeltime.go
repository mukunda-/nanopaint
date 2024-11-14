// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package core

// Address this problem in 126 years :)

type PixelTime uint32

const PixelTimeStart = 1731518957

func ToPixelTime(unixtime int64) PixelTime {
	return PixelTime(unixtime - PixelTimeStart)
}

func (t PixelTime) ToUnixTime() int64 {
	return int64(t) + PixelTimeStart
}
