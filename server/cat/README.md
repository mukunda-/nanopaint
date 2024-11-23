## cat

An error catcher package. This adds convenience functions to catch error conditions that
we don't want to handle. So rather than if err != nil { panic("reason") } we have 

cat.Catch(err, "reason")

Comes with other conveniences such as describing invalid arguments, permission errors,
and such.

cat.DenyIf(condition, "denied for this reason")
cat.BadIf(condition, "invalid argument was given!")

Provides an error recovery function to capture the error, log it if necessary, and return
details about it for presentation. Internal errors are not shown to the user, but other
error types are.
