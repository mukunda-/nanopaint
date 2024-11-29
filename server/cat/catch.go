// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package cat

import (
	"runtime/debug"

	"go.mukunda.com/nanopaint/common"
)

// Error catcher

var log = common.GetLogger("catch")

type Problem interface {
	Error() string
}

// ----------------------------------------------------------------------------------------
// Caused from uncontrolled panics.
type UnknownError struct{}

// Caused from bad arguments to a service.
type ArgumentError struct{ Message string }

// Caused from context permission issues.
type PermissionError struct{ Message string }

// Caused from poor execution conditions.
type ExecutionError struct{ Message string }

// Caused from missing resource.
type NotFoundError struct{ Message string }

// When passing an error directly as the problem.
type OtherError struct{ WrappedError error }

func (e UnknownError) Error() string    { return "Unknown error." }
func (e ArgumentError) Error() string   { return e.Message }
func (e PermissionError) Error() string { return e.Message }
func (e ExecutionError) Error() string  { return e.Message }
func (e NotFoundError) Error() string   { return e.Message }
func (e OtherError) Error() string      { return e.WrappedError.Error() }
func (e OtherError) Unwrap() error      { return e.WrappedError }

// ---------------------------------------------------------------------------------------
type ControlledError struct {
	// This is the source error condition, if the panic arose from an error.
	Error error

	// This is a description of the error.
	Problem Problem
}

// ---------------------------------------------------------------------------------------
// Panic handler.
func Handle(c common.Context, recovered any) ControlledError {

	// "Controlled" panics are expected in poor executions conditions, such as
	//  the database being unavailable for satisfying a request, or a bad
	//  configuration present. These is caused by "catch" finding an error.
	// They still cause "errors" in the log in case there is something the admin can fix.
	// "Uncontrolled" panics should never occur and are software defects, e.g., reading
	//  an array out of bounds.
	cp, ok := recovered.(ControlledError)

	if ok {
		// Log the problem message.
		le := log.E(c)

		if cp.Error != nil {
			// Log the error if present.
			le = le.WithError(cp.Error)
		}

		switch cp.Problem.(type) {
		case ExecutionError:
			// Execution errors are not shown to the user. Only logs.
			le.WithField("stack", string(debug.Stack())).
				WithField("problem", cp.Problem.Error()).
				Errorln("Controlled execution error.")
			return cp
		case PermissionError:
			le.WithField("problem", cp.Problem.Error()).
				Debugln("Caught permission error.")
			return cp
		case NotFoundError:
			le.WithField("problem", cp.Problem.Error()).
				Debugln("Caught 'not found' error.")
			return cp
		case ArgumentError:
			le.WithField("problem", cp.Problem.Error()).
				Debugln("Caught argument error (bad request).")
			return cp
		case OtherError:
			le.WithField("problem", cp.Problem.(OtherError).Unwrap()).
				Debugln("Caught wrapped error.")
			return cp
		default:
			le := log.E(c).WithField("problem", cp.Problem)

			// UNCONTROLLED:
			// These should not occur. We don't know where it came from.
			le.Errorln("Unknown controlled panic occurred.", string(debug.Stack()))
			return cp
		}
	}

	// UNCONTROLLED:
	// These should not occur and are panics caught from a mishandled scenario (programmer
	// error).
	log.Ec().
		WithField("reason", recovered).
		Errorln("Uncontrolled panic occurred.", string(debug.Stack()))

	return ControlledError{
		Problem: UnknownError{},
	}
}

// ---------------------------------------------------------------------------------------
// Bubble a basic ExecutionError upward.
func Bubble(err error) {
	if err != nil {
		Catch(err, err.Error())
	}
}

// ---------------------------------------------------------------------------------------
func translateProblem(problem any) Problem {
	switch p := problem.(type) {
	case UnknownError, ArgumentError, PermissionError, ExecutionError,
		NotFoundError, OtherError:

		return problem.(Problem)
	case string:
		return ExecutionError{p}
	case error:
		return OtherError{p}
	default:
		log.Errorln(nil, "Encountered unsupported problem:", problem)
		return UnknownError{}
	}
}

// ---------------------------------------------------------------------------------------
// Condition can be a bool or error. If the error is not nil or the bool is true, then
//
//	a controlled panic is raised.
func Catch(condition any, problem any) /* panics */ {
	if condition == nil {
		return
	}

	// We defer most logging to the catch handler because there we can easily add
	// context to the error, and we can avoid having to pass context to this function.

	switch cond := condition.(type) {
	case error:
		if cond != nil {
			log.WithError(nil, cond).Debugln("Catch is throwing from error.")
			panic(ControlledError{
				Error:   cond,
				Problem: translateProblem(problem),
			})
		}

	case bool:
		if cond {
			log.Debugln(nil, "Catch is throwing from bool.")
			panic(ControlledError{
				Problem: translateProblem(problem),
			})
		}

	default:
		log.Errorln(nil, "Unknown catch condition type:", cond)
		panic(ControlledError{
			Problem: ExecutionError{"Unknown catch condition type."},
		})
	}
}

// ---------------------------------------------------------------------------------------
// Wrapper for raising a Permission error.
func DenyIf(condition bool, message string) {
	Catch(condition, PermissionError{message})
}

// ---------------------------------------------------------------------------------------
// Wrapper for raising an Argument error.
func BadIf(condition bool, message string) {
	Catch(condition, ArgumentError{message})
}

// ---------------------------------------------------------------------------------------
// Wrapper for raising a Not Found error.
func NotFoundIf(condition bool, message string) {
	Catch(condition, NotFoundError{message})
}

type Lockable interface {
	TryLock() bool
	Unlock()
}

// ---------------------------------------------------------------------------------------
// Panics if a mutex is unlocked.
func EnsureLocked(lock Lockable) {
	if lock.TryLock() {
		defer lock.Unlock()
		panic("mutex was not locked")
	}
}
