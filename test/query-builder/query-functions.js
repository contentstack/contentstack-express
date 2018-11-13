// Recommended
// expect([1, 2, 3]).to.have.lengthOf(3);
// Not recommended
// expect([1, 2, 3]).to.have.lengthOf.above(2);
// expect([1, 2, 3]).to.have.lengthOf.below(4);
// expect([1, 2, 3]).to.have.lengthOf.at.least(3);
// expect([1, 2, 3]).to.have.lengthOf.at.most(3);
// expect([1, 2, 3]).to.have.lengthOf.within(2,4);
const Promise = require('bluebird');
const expect = require('chai').expect;
const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');
const fs = Promise.promisifyAll(require('fs'), {
  suffix: 'P'
});
const utils = require('./utils');
let connector = null;
let QueryBuilder, data;
describe('# Query builder - query-functions', function() {
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
  it('QF1. $where (query on reference field)', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .where('reference_to_b.title', 'Block 1')
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(4);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('reference_to_b');
          expect(entry.reference_to_b).to.be.an('array');
          expect(entry.reference_to_b[0].title).to.equal('Block 1');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF2. limit', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .limit(1)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF3. skip', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .skip(1)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(4);
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF4. exists()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .exists('special_key')
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('special_key');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF5. exists()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .exists('special_key')
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('special_key');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF6. notExists()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .notExists('special_key')
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(4);
        response[0].forEach(function(entry) {
          expect(entry).to.not.have.property('special_key');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF7. or()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .or({
        '_data.random_no_': {
          $eq: 1
        }
      }, {
        '_data.random_no_': {
          $eq: 2
        }
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.be.within(1, 2);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF8. and()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .and({
        '_data.random_no_': {
          $eq: 1
        }
      }, {
        '_data.boolean': true
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.equal(1);
          expect(entry).to.have.property('boolean');
          expect(entry.boolean).to.be.true;
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF9. containedIn()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .containedIn('tags', ['a'])
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(3);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('tags');
          expect(entry.tags).to.be.an('array');
          expect(entry.tags).to.include('a');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF10. notContainedIn()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .notContainedIn('tags', ['a'])
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('tags');
          expect(entry.tags).to.be.an('array');
          expect(entry.tags).to.not.include('a');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF11. greaterThanEqualTo()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .greaterThanEqualTo('random_no_', 4)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.be.at.least(4);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF12. greaterThan()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .greaterThan('random_no_', 4)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.be.at.least(5);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF13. lessThanEqualTo()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .lessThanEqualTo('random_no_', 2)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.be.at.most(2);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF14. lessThan()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .lessThan('random_no_', 2)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.be.at.most(1);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF15. notEqualTo', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .notEqualTo('random_no_', 1)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(4);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.not.equal(1);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF16. includeCount()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .includeCount()
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(2);
        expect(response[0]).to.have.lengthOf(5);
        expect(response[1]).to.equal(5);
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('QF17. referenceDepth()', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .referenceDepth(1)
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(5);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('reference_to_b');
          expect(entry.reference_to_b).to.be.an('array');
          expect(entry.reference_to_b).to.satisfy(function(ref) {
            if (~ref.length) {
              return true;
            } else {
              ref.forEach(function(refEntry) {
                expect(refEntry).to.have.property('reference');
                expect(refEntry.reference).to.be.an('array');
                expect(refEntry.reference).to.have.lengthOf(0);
              });
              return true;
            }
          });
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
});