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
	"go.mukunda.com/nanopaint/config"
	"go.mukunda.com/nanopaint/core/clock"
	"go.uber.org/fx"
)

// ---------------------------------------------------------------------------------------
type HttpService interface {
	GetPort() int
	Router() Router
	Echo() *echo.Echo
	UseRateLimiter() echo.MiddlewareFunc
}

// ---------------------------------------------------------------------------------------
type Router interface {
	GET(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	POST(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	PUT(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
	DELETE(path string, handler echo.HandlerFunc, middleware ...echo.MiddlewareFunc) *echo.Route
}

type httpConfig struct {
	Port             int  `yaml:"port"`
	RateLimitPeriod  int  `yaml:"rateLimitPeriod"`
	RateLimitBurst   int  `yaml:"rateLimitBurst"`
	DisableRateLimit bool `yaml:"disableRateLimit"`
}

// ---------------------------------------------------------------------------------------
type httpService struct {
	Port        int
	E           *echo.Echo
	closeSignal chan int
	server      *http.Server
	listener    net.Listener
	config      httpConfig
	rateLimiter RateLimiter
}

var defaultHttpConfig = httpConfig{
	Port:             1452,
	RateLimitPeriod:  100,
	RateLimitBurst:   10,
	DisableRateLimit: false,
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
func CreateHttpService(lc fx.Lifecycle, config config.Config, clock clock.ClockService) HttpService {
	log.Infoln(nil, "Creating HTTP Service.")
	hs := &httpService{
		E:           echo.New(),
		closeSignal: make(chan int),
	}
	hs.config = defaultHttpConfig
	config.Load("http", &hs.config)
	installErrorsMiddleware(hs.E)
	hs.installMiddleware()
	if !hs.config.DisableRateLimit {
		hs.rateLimiter = CreateRateLimiter(hs.config.RateLimitPeriod, hs.config.RateLimitBurst, clock)
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

func (hs *httpService) installMiddleware() {

}

// ---------------------------------------------------------------------------------------
// Start on the default port.
func (hs *httpService) start() {
	go func() {
		log.Infoln(nil, "Starting HTTP listener on port", hs.Port)
		if err := hs.server.Serve(hs.listener); err != http.ErrServerClosed {
			log.WithError(nil, err).Fatalln("HTTP service error.")
		}
		log.Infoln(nil, "HTTP server has been closed.")
		hs.closeSignal <- 1
	}()
}

// ---------------------------------------------------------------------------------------
// Get the port we're listening to.
func (hs *httpService) GetPort() int {
	return hs.Port
}

// ---------------------------------------------------------------------------------------
// Shut down the HTTP server.
func (hs *httpService) stop() {
	log.Infoln(nil, "Stopping HTTP service.")
	hs.server.Shutdown(context.TODO())
	log.Infoln(nil, "Stopped HTTP service.")
}

// ---------------------------------------------------------------------------------------
// Get the underlying Echo instance.
func (hs *httpService) Echo() *echo.Echo {
	// Maybe we could replace this with some simple interfaces that we need? And not expose
	// the entire Echo object.
	return hs.E
}

// ---------------------------------------------------------------------------------------
// Get the Router (partial interface from Echo) for controllers to add routes.
func (hs *httpService) Router() Router {
	return hs.E
}

func (hs *httpService) UseRateLimiter() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()
			if ip == "" {
				ip = c.Request().RemoteAddr
			}

			if hs.rateLimiter != nil && !hs.rateLimiter.Allow(ip) {
				return c.JSON(429, baseResponse{
					Code:    "RATE_LIMIT",
					Message: "Rate limit exceeded.",
				})
			}

			return next(c)
		}
	}
}
