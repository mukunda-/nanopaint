// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package common

// ///////////////////////////////////////////////////////////////////////////////////////
// Context keeps track of data for each request, passed around the system.
// echo.Context provides this interface as well, so we can easily convert between the two.
type Context interface {
	Get(key string) any
	Set(key string, value any)
}

type basicContext struct {
	data map[string]any
}

func (c *basicContext) Get(key string) any {
	return c.data[key]
}

func (c *basicContext) Set(key string, value any) {
	c.data[key] = value
}

func CreateBasicContext() Context {
	c := &basicContext{
		data: make(map[string]any),
	}
	return c
}
