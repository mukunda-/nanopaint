// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import (
	"context"
	"net"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/fx"
)

// ---------------------------------------------------------------------------------------
type HttpService interface {
	GetPort() int
	Router() Router
	Echo() *echo.Echo
}

// ---------------------------------------------------------------------------------------
type Router interface {
	GET(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	POST(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	PUT(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	DELETE(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
}

// ----------------------------------------------------------------------------------------
type httpService struct {
	Port        int
	E           *echo.Echo
	closeSignal chan int
	server      *http.Server
	listener    net.Listener
}

// ---------------------------------------------------------------------------------------
func createListener(port int) net.Listener {
	listener, err := net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		log.Ec().WithError(err).Fatalln("Failed to create listener.")
	}
	return listener
}

// ---------------------------------------------------------------------------------------
func createServer(e *echo.Echo, port int) (*http.Server, net.Listener, int) {
	listener := createListener(port)
	actualPort := listener.Addr().(*net.TCPAddr).Port

	server := http.Server{
		Handler: e,
	}

	return &server, listener, actualPort
}

// ---------------------------------------------------------------------------------------
func CreateHttpService(lc fx.Lifecycle) HttpService {
	log.Infoln(nil, "Creating HTTP Service.")
	hs := &httpService{
		E:           echo.New(),
		closeSignal: make(chan int),
	}
	hs.server, hs.listener, hs.Port = createServer(hs.E, hs.config.Port)

	lc.Append(fx.Hook{
		OnStart: func(context context.Context) error {
			hs.start()
			return nil
		},
		OnStop: func(context context.Context) error {
			hs.stop()
			return nil
		},
	})

	return hs
}
