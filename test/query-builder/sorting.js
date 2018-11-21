const expect = require('chai').expect;
const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');

const utils = require('./utils');
let connector = null;
let QueryBuilder, data;

describe('# Query builder - find & sorting', function() {
  this.timeout(5000);
  before(function loadQueryBuilderInstance() {
    QueryBuilder = require('../../lib/utils').db;
  });
  // Clean any existing _content before loading fresh data
  after(function cleanConfigFolder(done) {
    const content_path = path.join(__dirname, '..', '..', '_content');
    rimraf(content_path, done);
  });
  before(function loadData(done) {
    // keep copy dummy data to working dir
    return ncp(path.join(__dirname, '..', '_content'), path.join(__dirname, '..', '..', '_content'), done);
  });
  it('Sort-1. Sort by name (ascending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').ascending('name').toJSON().find().then(function success(response) {
      console.log('@name result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('Sort-2. Sort by lastname (ascending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').ascending('lastname').toJSON().find().then(function success(response) {
      console.log('@lastname result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('Sort-3. Sort by age (descending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').ascending('age').toJSON().find().then(function success(response) {
      console.log('@age result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('Sort-4. Sort by name (descending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').descending('name').toJSON().find().then(function success(response) {
      console.log('@name result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('Sort-5. Sort by lastname (descending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').descending('lastname').toJSON().find().then(function success(response) {
      console.log('@lastname result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('Sort-6. Sort by age (descending)', function() {
    QueryBuilder.ContentType('mock_sorting_data').Query().language('es-es').descending('age').toJSON().find().then(function success(response) {
      console.log('@age result')
      console.log(JSON.stringify(response))
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(7);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('name');
        expect(entry.name).to.be.an('string');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
});