// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package common

import "github.com/sirupsen/logrus"

type Ct = Context

// ///////////////////////////////////////////////////////////////////////////////////////
// A logger is stored globally across each package. The logger automatically tags log
//	lines with the package name. Output is written to the console and optionally a file.
type Logger struct {
	logger *logrus.Logger
	level  logrus.Level
	name   string
}

const unsetLevel logrus.Level = 999

var loggers = make(map[string]*Logger)
var defaultLogLevel = logrus.InfoLevel

// ---------------------------------------------------------------------------------------
func (logger *Logger) updateLogLevel() {
	if logger.level == unsetLevel {
		logger.logger.SetLevel(defaultLogLevel)
	} else {
		logger.logger.SetLevel(logger.level)
	}
}

// ---------------------------------------------------------------------------------------
func GetLogger(name string) *Logger {
	logger, ok := loggers[name]
	if !ok {
		logger = &Logger{
			logger: logrus.New(),
			name:   name,
			level:  unsetLevel,
		}
		logger.logger.SetFormatter(&logrus.TextFormatter{
			ForceColors: true,
		})
		logger.updateLogLevel()
		loggers[name] = logger
	}
	return logger
}

// ---------------------------------------------------------------------------------------
func (logger *Logger) E(c Ct) *logrus.Entry {

	le := logger.logger.WithField("L", logger.name)
	if c != nil {
		username := c.Get("username")
		if username != "" {
			le = le.WithField("U", c.Get("username"))
		} else {
			le = le.WithField("U", "(system)")
		}
		return le.WithField("#", c.Get("rid"))
	}

	return le
}

// ---------------------------------------------------------------------------------------
func (logger *Logger) Ec() *logrus.Entry {
	return logger.E(nil)
}

// ---------------------------------------------------------------------------------------
// Shorthand wrappers so we can just write "log.xyz" without E()
func (l *Logger) Debugln(c Ct, args ...any) { l.E(c).Debugln(args...) }
func (l *Logger) Infoln(c Ct, args ...any)  { l.E(c).Infoln(args...) }
func (l *Logger) Warnln(c Ct, args ...any)  { l.E(c).Warnln(args...) }
func (l *Logger) Errorln(c Ct, args ...any) { l.E(c).Errorln(args...) }

// ---------------------------------------------------------------------------------------
func (logger *Logger) WithField(c Ct, key string, value any) *logrus.Entry {
	return logger.E(c).WithField(key, value)
}

// ---------------------------------------------------------------------------------------
func (logger *Logger) WithError(c Ct, err error) *logrus.Entry {
	return logger.E(c).WithError(err)
}

// ---------------------------------------------------------------------------------------
func (logger *Logger) AddHook(hook logrus.Hook) {
	logger.logger.AddHook(hook)
}

// ---------------------------------------------------------------------------------------
func SetDefaultLogLevel(level logrus.Level) {
	defaultLogLevel = level
	for _, elem := range loggers {
		elem.updateLogLevel()
	}
}

// ---------------------------------------------------------------------------------------
func SetLogLevel(name string, level logrus.Level) {
	l := GetLogger(name)
	l.level = level
	l.updateLogLevel()
}

// ---------------------------------------------------------------------------------------
func UnsetLogLevel(name string) {
	l := GetLogger(name)
	l.level = unsetLevel
}
