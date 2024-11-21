// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

import "go.uber.org/fx"

// ---------------------------------------------------------------------------------------
// We need to provide controllers with this annotation in order to create them since
// controllers are not injected into any services.
// Alternatively, we could have a service that depends on all controllers, but then
// we'd have to specify the controller in two places (creation and injection).
func annotateController(c any) any {
	return fx.Annotate(
		c,
		fx.As(new(Controller)),
		fx.ResultTags(`group:"controllers"`),
	)
}

// ---------------------------------------------------------------------------------------
func unwrapHttpRouter(hs HttpService) Router {
	return hs.Router()
}

// ---------------------------------------------------------------------------------------
type StartControllersParam struct {
	fx.In

	Controllers []Controller `group:"controllers"`
}

// ---------------------------------------------------------------------------------------
func Fx() fx.Option {
	return fx.Options(
		fx.Provide(
			CreateHttpService,
			unwrapHttpRouter,

			annotateController(CreateTestController),
		),

		// Create all controllers.
		fx.Invoke(func(s StartControllersParam) {}),
	)
}
