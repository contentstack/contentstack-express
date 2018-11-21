const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');

let connector = null;

describe('Contentstack-Connector', function () {
	this.timeout(5000);
	describe('Content Management methods', function () {
		before(function copyContentFolder (done) {
			// keep a config on the working directory
			ncp(path.join(__dirname, 'config'), path.join(__dirname, '..', 'config'), done);
		});

		before(function copyThemesFolder (done) {
			// keep a config on the working directory
			ncp(path.join(__dirname, 'config'), path.join(__dirname, '..', 'themes'), done);
		});

		after(function cleanContentFolder (done) {
			const content_path = path.join(__dirname, '..', '_content');
			rimraf(content_path, function (error) {
				done(error);
			});
		});

		after(function cleanConfigFolder (done) {
			const content_path = path.join(__dirname, '..', 'config');
			rimraf(content_path, function (error) {
				done(error);
			});
		});

		after(function cleanThemesFolder (done) {
			const content_path = path.join(__dirname, '..', 'themes');
			rimraf(content_path, function (error) {
				done(error);
			});
		});

		after(function cleanLogs (done) {
			const content_path = path.join(__dirname, '..', '_logs');
			rimraf(content_path, function (error) {
				done(error);
			});
		});

		require('./query-builder/upsert');
		require('./query-builder/find');
		require('./query-builder/query');
		require('./query-builder/query-functions');
		require('./query-builder/sorting');
	});
});