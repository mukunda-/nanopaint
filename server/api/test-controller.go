// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package api

type TestController interface {
	GetTest(c Ct) error
	PostTest(c Ct) error
	PutTest(c Ct) error
	DeleteTest(c Ct) error
	PostTestRateLimit(c Ct) error
}

type testController struct{}

// ---------------------------------------------------------------------------------------
func CreateTestController(routes Router, hs HttpService) TestController {
	tc := testController{}
	routes.GET("/api/test", tc.GetTest)
	routes.POST("/api/test", tc.PostTest)
	routes.PUT("/api/test", tc.PutTest)
	routes.DELETE("/api/test", tc.DeleteTest)
	routes.POST("/api/test-ratelimit", tc.PostTestRateLimit, hs.UseRateLimiter())
	return &tc
}

// ---------------------------------------------------------------------------------------
func (tc *testController) GetTest(c Ct) error {
	return c.JSON(200, baseResponse{
		Code:    "TEST",
		Message: "Test GET endpoint.",
	})
}

// ---------------------------------------------------------------------------------------
func (tc *testController) PostTest(c Ct) error {
	return c.JSON(200, baseResponse{
		Code:    "TEST",
		Message: "Test POST endpoint.",
	})
}

// ---------------------------------------------------------------------------------------
func (tc *testController) PutTest(c Ct) error {
	return c.JSON(200, baseResponse{
		Code:    "TEST",
		Message: "Test PUT endpoint.",
	})
}

// ---------------------------------------------------------------------------------------
func (tc *testController) DeleteTest(c Ct) error {
	return c.JSON(200, baseResponse{
		Code:    "TEST",
		Message: "Test DELETE endpoint.",
	})
}

// ---------------------------------------------------------------------------------------
func (tc *testController) PostTestRateLimit(c Ct) error {
	return c.JSON(200, baseResponse{
		Code:    "TEST",
		Message: "Test rate limit endpoint.",
	})
}
