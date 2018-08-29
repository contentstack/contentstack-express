const Promise = require('bluebird');
const expect = require('chai').expect;
const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');
const fs = Promise.promisifyAll(require('fs'), {suffix: 'P'});

const utils = require('./utils');

let connector = null;
let QueryBuilder, data;

describe('# Query builder - upsert', function () {
	this.timeout(5000);
	before(function loadQueryBuilderInstance () {
		QueryBuilder = require('../../lib/utils').db;
	});

	// Clean any existing _content before loading fresh data
	after(function cleanConfigFolder (done) {
		const content_path = path.join(__dirname, '..', '..', '_content');
		rimraf(content_path, function (error) {
			return done(error);
		});
	});

	before(function loadData () {
		// keep copy dummy data to working dir
		data = utils.getData();
	});

	it('U1. Upsert an entry', function () {
		QueryBuilder.ContentType('beta').Entry(data.entry.uid).language('es-es').update(data.entry).then(function (status) {
			console.log('Upsert status: ' + status);
		}).catch(function (error) {
			console.error(error);
		});
	});
});