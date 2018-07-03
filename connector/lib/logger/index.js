const fs = require('fs');
const path = require('path');
const winston = require('winston');
const mkdirp = require('mkdirp');
const config = require('../config');
const _default = require('./default');

let logger = null;

class Logger {
	constructor () {
		if (!logger)
			logger = this;
		return logger;
	}

	load () {
		try {
			config.logs = config.logs || {};
			config.logger = config.logger || {};
			
			// Error logger
			config.logger.error = this.build({
				name: (config.logs.error && config.logs.error.name) ? config.logs.error.name : _default.error.name,
				console: (config.logs.error && typeof config.logs.error.console === 'boolean') ? config.logs.error.console : ((typeof config.logs.console === 'boolean') ? config.logs.console: _default.error.console),
				level: (config.logs.error && config.logs.error.level) ? config.logs.error.level : ((config.logs.level) ? config.logs.level: _default.error.level),
				path: (config.logs.error && config.logs.error.path) ? config.logs.error.path : ((config.logs.path) ? config.logs.path : _default.error.path),
				timestamp: (config.logs.error && typeof config.logs.error.timestamp === 'boolean') ? config.logs.error.timestamp : ((typeof config.logs.timestamp === 'boolean') ? config.logs.timestamp: _default.error.timestamp),
				maxsize: (typeof config.logs.maxsize === 'number') ? config.logs.maxsize: _default.maxsize
			});

			// App logger
			config.logger.listener = this.build({
				name: (config.logs.listener && config.logs.listener.name) ? config.logs.listener.name : _default.listener.name,
				console: (config.logs.listener && typeof config.logs.listener.console === 'boolean') ? config.logs.listener.console : ((typeof config.logs.console === 'boolean') ? config.logs.console: _default.listener.console),
				level: (config.logs.listener && config.logs.listener.level) ? config.logs.listener.level : ((config.logs.level) ? config.logs.level: _default.listener.level),
				path: (config.logs.listener && config.logs.listener.path) ? config.logs.listener.path : ((config.logs.path) ? config.logs.path : _default.listener.path),
				timestamp: (config.logs.listener && typeof config.logs.listener.timestamp === 'boolean') ? config.logs.listener.timestamp : ((typeof config.logs.timestamp === 'boolean') ? config.logs.timestamp: _default.listener.timestamp),
				maxsize: (typeof config.logs.maxsize === 'number') ? config.logs.maxsize: _default.maxsize
			});

			// Debugger
			config.logger.debug = this.build({
				name: (config.logs.debugger && config.logs.debugger.name) ? config.logs.debugger.name : _default.debugger.name,
				console: (config.logs.debugger && typeof config.logs.debugger.console === 'boolean') ? config.logs.debugger.console : _default.debugger.console,
				level: (config.logs.debugger && config.logs.debugger.level) ? config.logs.debugger.level : _default.debugger.level,
				path: (config.logs.debugger && config.logs.debugger.path) ? config.logs.debugger.path : _default.debugger.path,
				timestamp: (config.logs.debugger && typeof config.logs.debugger.timestamp === 'boolean') ? config.logs.debugger.timestamp : _default.debugger.timestamp,
				maxsize: (typeof config.logs.debugger === 'number') ? config.logs.maxsize: _default.maxsize
			});

			// Provider logger
			config.logger.provider = this.build({
				name: (config.logs.provider && config.logs.provider.name) ? config.logs.provider.name : _default.provider.name,
				console: (config.logs.provider && typeof config.logs.provider.console === 'boolean') ? config.logs.provider.console : _default.provider.console,
				level: (config.logs.provider && config.logs.provider.level) ? config.logs.provider.level : _default.provider.level,
				path: (config.logs.provider && config.logs.provider.path) ? config.logs.provider.path : _default.provider.path,
				timestamp: (config.logs.provider && typeof config.logs.provider.timestamp === 'boolean') ? config.logs.provider.timestamp : _default.provider.timestamp,
				maxsize: (typeof config.logs.maxsize === 'number') ? config.logs.maxsize: _default.maxsize
			});

			config.logger.plugins = this.build({
				name: (config.logs.plugins && config.logs.plugins.name) ? config.logs.plugins.name : _default.plugins.name,
				console: (config.logs.plugins && typeof config.logs.plugins.console === 'boolean') ? config.logs.plugins.console : _default.plugins.console,
				level: (config.logs.plugins && config.logs.plugins.level) ? config.logs.plugins.level : _default.plugins.level,
				path: (config.logs.plugins && config.logs.plugins.path) ? config.logs.plugins.path : _default.plugins.path,
				timestamp: (config.logs.plugins && typeof config.logs.plugins.timestamp === 'boolean') ? config.logs.plugins.timestamp : _default.plugins.timestamp,
				maxsize: (typeof config.logs.maxsize === 'number') ? config.logs.maxsize: _default.maxsize
			});
			console.log('logger loaded');
		} catch (error) {
			console.error(`Error while loading logger: ${error}`);
		}
	}

	build (logObj) {
		try {
			if (!fs.existsSync(path.join(config._path.base, logObj.path))) mkdirp.sync(path.join(config._path.base, logObj.path));

			winston.loggers.add(logObj.name, {
				console: {
					level: (logObj.console) ? 'info': 'none',
					colorize: true
				},
				file: {
					level: logObj.level || 'info',
					timestamp: logObj.timestamp,
					// format: winston.format[logObj.format](),
					maxsize: logObj.maxsize,
					filename: path.join(config._path.base, logObj.path, logObj.name + '.log')
				}
			});

			function ignoreEpipe (error) {
				return error.code !== 'EPIPE';
			}

			let log = winston.loggers.get(logObj.name);
			log.exitOnError = ignoreEpipe;

			return log;
		} catch (error) {
			console.error(`Error while building logger objects.
				${error}\n`);
		}
	} 
}

module.exports = new Logger();