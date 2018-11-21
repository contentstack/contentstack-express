const expect = require('chai').expect;
const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');

const utils = require('./utils');
let connector = null;
let QueryBuilder, data;

describe('# Query builder - find', function() {
  this.timeout(5000);
  before(function loadQueryBuilderInstance() {
    QueryBuilder = require('../../lib/utils').db;
  });
  // Clean any existing _content before loading fresh data
  after(function cleanConfigFolder(done) {
    const content_path = path.join(__dirname, '..', '..', '_content');
    rimraf(content_path, function(error) {
      return done(error);
    });
  });
  before(function loadData(done) {
    // keep copy dummy data to working dir
    return ncp(path.join(__dirname, '..', '_content'), path.join(__dirname, '..', '..', '_content'), done);
  });
  it('F1. all entries with references', function() {
    QueryBuilder.ContentType('a').Query().language('es-es').toJSON().find().then(function success(response) {
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(5);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('modular_blocks');
        expect(entry.modular_blocks).to.be.an('array');
        expect(entry.modular_blocks[0]).to.have.property('block_one');
        expect(entry.modular_blocks[0].block_one).to.have.property('self_reference');
        expect(entry.modular_blocks[0].block_one.self_reference[0]).to.have.property('title');
        expect(entry.modular_blocks[0].block_one.self_reference[0]).to.have.property('uid');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('F2. all entries without references', function() {
    QueryBuilder.ContentType('a').Query().language('es-es').excludeReference().toJSON().find().then(function success(response) {
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(5);
      response[0].forEach(function(entry) {
        expect(entry).to.have.property('modular_blocks');
        expect(entry.modular_blocks).to.be.an('array');
        expect(entry.modular_blocks[0]).to.have.property('block_one');
        expect(entry.modular_blocks[0].block_one).to.have.property('self_reference');
        expect(entry.modular_blocks[0].block_one.self_reference).to.have.property('values');
        expect(entry.modular_blocks[0].block_one.self_reference).to.have.property('_content_type_id');
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
  it('F3. sorting - ascending ', function() {
    QueryBuilder.ContentType('a').Query().language('es-es').toJSON().ascending('_version').find().then(function success(response) {
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(5);
      let temp_value = response[0][0]._version;
      response[0].forEach(function(entry) {
        expect(temp_value).to.be.at.most(entry._version);
        temp_value = entry._version;
      });
    }).catch(function error(error) {
      console.error(error);
    });
  });
});