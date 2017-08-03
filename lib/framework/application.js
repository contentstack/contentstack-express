/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var express = require('express'),
	fs = require('graceful-fs'),
	path = require('path'),
	_ = require('lodash'),
	methods = require('methods'),
	engines = require("consolidate"),
	helmet = require('helmet'),
	favicon = require('serve-favicon'),
	middlewares = require('./middlewares/index'),
	utils = require('./../utils/index');

var config = utils.config,
	log = utils.access,
	security = config.get('security');

var app = module.exports = express.application;

/**
 * Application initializer with more default configuration settings
 */
app.fuse = function () {
	this.init();

	// load plugins
	utils.plugin.load();

	// helper used to add the locals functions
	require('./helpers')(this);
	/**
	 * STEP 1 : Default configuration
	 * Load default configuration
	 */
	var module = config.get('view.module') || 'nunjucks',
		ext = config.get('view.extension') || 'html';
	if (engines[module]) {
		this.set('view engine', ext);
		this.engine(ext, engines[module]);
		// views configurations
		if(module) {
			var _engine = require(module);
			var _plugins = utils.plugin._templateExtends;
			for(var plugin_key in _plugins) {
				_plugins[plugin_key](_engine, this);
			}
		}
	} else {
		var msg = 'Do not support ' + module + ' template engine.';
		throw Error(msg);
	}

	// express.js security with HTTP headers using helmet middleware
	if (security) {
		for (var key in security) {
			if(security[key]) {
				// x-powered-By
				if(key === 'hidePoweredBy') {
					this.disable('x-powered-by');
				} else {
					this.enable('x-powered-by');
				}
				var fun = helmet + '.' + key + '()'
				this.use(helmet)
			}
		}

	}

	// enable logger
	this.enable('logger');
	// x-runtime
	this.enable('x-runtime');
	// slash
	this.disable('slashes');

	/**
	 * STEP 2 : Static file
	 * Serve static files such as css, js, fonts, etc.
	 */
	var _static = config.get('static') || {},
		_staticOptions = config.get('static.options') || {};

	var faviconPath = config.get('path.favicon');
	if(fs.existsSync(faviconPath)) this.use(favicon(faviconPath));

	if(_static) {
		var _path = (path.isAbsolute(_static.path)) ? _static.path : path.join(config.get('path.theme'), (_static.path || './public'));
		this.use((_static.url || "/static"), express.static(_path, _staticOptions));
	}
	/**
	 * STEP 3 : Standard middlewares I
	 * Load standard middlewares like domain-context, contentstack-boot, etc.
	 */
	this.use(middlewares.domainContext());
	this.use(middlewares.boot(utils));
};

var _use = app.use;

app.use = function () {

	// if the incoming request is from the router/app then add the extends
	if (arguments.length == 2 && arguments['1'].stack && arguments['1']._extends) {
		// push 'extended' identifier in stack to identify extended router
		this._router.stack.push('extended');
		_use.apply(this, [arguments['0'], arguments['1']._extends]);
	}
	_use.apply(this, arguments);
	return this;
};

app.extends = function () {
	this.lazyrouter();
	// push 'extended' identifier in stack to identify extended router
	this._router.stack.push('extended');
	return this;
};

app.error = function () {
	// push 'error' identifier in stack to identify extended router
	this._router.stack.push('error');
	_use.apply(this, arguments);
};

var _listen = app.listen;


app.listen = function () {
	// load plugins
	for (var key in utils.plugin._serverExtends) {
		utils.plugin._serverExtends[key](this);
	}
	var stack = this._router.stack,
		_extended = [],
		_error = [],
        _staticRoutes = [],
        publicStatic = _.findIndex(stack, {name: 'serveStatic'});
	var i = 0, flag = false;
	while (i < stack.length) {
        if(stack[i] && typeof stack[i] === 'object' && stack[i]['name'] && stack[i]['name'] === 'serveStatic' && i !== publicStatic) {
            _staticRoutes = _staticRoutes.concat(stack.splice(i, 1));
            flag = false;
        } else if (stack[i] === 'extended' || stack[i] === 'error') {
			flag = stack[i];
			stack.splice(i, 1);
		} else {
			if (flag === 'extended') {
				_extended.push(stack.splice(i, 1).shift());
			} else if (flag === 'error') {
				_error.push(stack.splice(i, 1).shift());
			} else {
				i++;
			}
			flag = false;
		}
	}
	/**
	 * STEP 3 : Standard middlewares II
	 * Load standard middlewares like request logger, powered-by, response time, connect-slashes, etc.
	 */
	var idx = _.findIndex(stack, {name: 'boot'}),
		l = stack.length, _middlewares = [++idx, 0];
    if (this.enabled('logger')) this.use(middlewares.requestLogger(log));
	if (this.enabled('x-powered-by')) this.use(middlewares.poweredBy(this.get('x-powered-by')));
	if (this.enabled('x-runtime')) this.use(middlewares.responseTime());

	// define routes to serve specific language's assets
	var languages = config.get('languages'),
        assets = config.get('assets'),
        assetStaticOpt = config.get('assets.options'),
		_url;
	for (var m = 0, _m = languages.length; m < _m; m++) {
		var lang = languages[m];
		_url = assets.relative_url_prefix;
		if (!(lang.relative_url_prefix === "/" || lang.host)) {
			_url = lang.relative_url_prefix.slice(0, -1) + assets.relative_url_prefix;
		}
		this.use(_url, express.static(lang.assetsPath, assetStaticOpt));
	}

	// setting the language for the requests
	this.use(middlewares.init(utils));

	// skipping the language prefix and .json from "/" appending
	var opt = this.get('slashes.options');
	opt = (opt && typeof opt === "object") ? opt : {};
	opt.skip = new RegExp("(^("+_.pluck(languages, "relative_url_prefix").join("|")+")|[.]json)$");
	this.use(middlewares.slashes(this.get('slashes'), opt));

	stack.splice.apply(stack, _middlewares.concat(stack.splice((stack.length - l) * -1)));

    /*
    * Appending the static middlewares before slashes and after the "Asset Static"
    * */
    _middlewares = [(_.findLastIndex(stack, {name: 'serveStatic'}) + 1), 0].concat(_staticRoutes);
    stack.splice.apply(stack, _middlewares);

    /**
	 * STEP 4 : Contentstack middlewares
	 * Load Contentstack middlewares such as content-smug, matrix-manager, etc.
	 */
	this.use(middlewares.smug(utils));
	this.use(middlewares.matrix(utils));
	/**
	 * STEP 5 : Extensions
	 * Load extended routes
	 */
	this._router.stack = stack.concat(_extended);
	/**
	 * STEP 6 : Send
	 * Send response
	 */
	this.use(respond());
	/**
	 * STEP 7 : Error Handler
	 * Error handler
	 */
	this.use(middlewares.notFound(utils));
	this._router.stack = this._router.stack.concat(_error);
	this.use(middlewares.errorHandler(utils));

	/**
	 * STEP 8 : Start server
	 * Start server
	 */
	_listen.apply(this, arguments);
};


/*
 Respond
 */
function respond() {
	return function (req, res, next) {
		if (req._contentstack.response_type !== 'json') {
			if (req._contentstack.template && req._contentstack.entry) {
				var result = {};
				_.merge(result, req._contentstack); // to store the internal route details
				_.merge(result, req.entry); // to merge the context data
				utils.context.set('entry', result.entry);
				res.render(req._contentstack.template, result);
			} else {
				next();
			}
		} else if(req._contentstack.entry) {
			var result = {};
			_.merge(result, req._contentstack); // to store the internal route details
			_.merge(result, req.entry); // to merge the context data
			// remove the not required keys
			delete result.originalUrl;
			delete result.parsedUrl;
			delete result.response_type;
			res.jsonp(result);
		} else {
			next();
		}
	};
}
