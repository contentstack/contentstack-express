/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Log request info
 */
module.exports = function (log) {
	log = log || console;
	return function requestLogger(req, res, next) {
		res.on('finish', function () {
			try {
				var referrer = req.headers["referer"],
					runTime = res._headers['x-runtime'];

				var _log = {
					ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || (req.ips.length ? req.ips : null) || req.ip || '0.0.0.0',
					status_code: res.statusCode,
					method: req.method,
					originalUrl: req.originalUrl,
					language: {
						url: (req.contentstack.get('lang')) ? req.contentstack.get('lang').url : req.url,
						code: (req.contentstack.get('lang')) ? req.contentstack.get('lang').code : ''
					},
					http_version: req.httpVersion,
					size: req.socket.bytesWritten,
					user_agent: req.headers["user-agent"]
				};

				if (runTime) _log.runtime = runTime;
				if (referrer) _log.referrer = referrer;
				log.info(_log);
			} catch (e) {
				console.error.apply(log, ["Error: %s \nDetails: %s", e.message, e.stack]);
			}
		});
		next();
	};
};