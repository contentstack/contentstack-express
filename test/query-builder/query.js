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
describe('# Query builder - query', function() {
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
  it('Q1. find single entry with reference', function() {
    QueryBuilder.ContentType('a').Query().language('es-es').toJSON().query({
      '_data.uid': 'blt2558ab1b3a75d131'
    }).find().then(function success(response) {
      expect(response).to.be.an('array');
      expect(response).to.have.lengthOf(1);
      expect(response[0]).to.have.lengthOf(1);
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
  it('Q2. $in', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.tags': {
          $in: ['a']
        }
      })
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
  it('Q3. $nin', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.tags': {
          $nin: ['a']
        }
      })
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
  it('Q4. $exists', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.special_key': {
          $exists: true
        }
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        expect(response[0][0]).to.have.property('special_key');
        expect(response[0][0].special_key).to.be.true;
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('Q5. $gte', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          '$gte': 4
        }
      })
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
  it('Q6. $gt', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          $gt: 4
        }
      })
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
  it('Q7. $lte', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          $lte: 2
        }
      })
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
  it('Q8. $lt', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          $lt: 2
        }
      })
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
  it('Q8. $eq', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          $eq: 1
        }
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          expect(entry.random_no_).to.equal(1);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('Q9. $ne', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.random_no_': {
          $ne: 1
        }
      })
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
  it('10. $and', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        $and: [
          {
            '_data.random_no_': {
              $eq: 1
            }
          },
          {
            '_data.boolean': true
          }
        ]
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
  it('11. $or', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        $or: [
          {
            '_data.random_no_': {
              $eq: 1
            }
          },
          {
            '_data.random_no_': {
              $eq: 2
            }
          }
        ]
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          // expect(entry.random_no_).should.satisfy(function (no) {
          //   if (no === 1 || no === 2) {
          //     return true;
          //   } else {
          //     return false;
          //   }
          // });
          // OR
          expect(entry.random_no_).to.be.within(1, 2);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('12. $nor', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        $nor: [
          {
            '_data.random_no_': {
              $eq: 1
            }
          },
          {
            '_data.random_no_': {
              $eq: 2
            }
          },
          {
            '_data.uid': 'external_reference_three'
          }
        ]
      })
      .find()
      .then(function success(response) {
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(2);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('random_no_');
          // using should
          expect(entry.random_no_).to.satisfy(function(no) {
            if (no !== 1 || no !== 2) {
              return true;
            } else {
              return false;
            }
          });
          expect(entry.uid).to.not.equal('external_reference_three');
          // OR
          // expect(entry.random_no_).to.be.within(1, 2);
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('13. $not', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .excludeReference()
      .query({
        '_data.tags': {
          $not: {
            $in: ['a']
          }
        }
      })
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
  it('14. $where (query on reference field)', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .where('reference_to_b.title', 'Block 1')
      .find()
      .then(function success(response) {
        console.log('@where');
        console.log(JSON.stringify(response))
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
  it('15. $where (query on reference of reference) #fails', function() {
    QueryBuilder.ContentType('external_reference').Query()
      .language('es-es')
      .toJSON()
      .where('reference_to_b.reference.title', 'One')
      .find()
      .then(function success(response) {
        // console.log('@response: ' + JSON.stringify(response));
        expect(response).to.be.an('array');
        expect(response).to.have.lengthOf(1);
        expect(response[0]).to.have.lengthOf(1);
        response[0].forEach(function(entry) {
          expect(entry).to.have.property('reference_to_b');
          expect(entry.reference_to_b).to.be.an('array');
          expect(entry.reference_to_b[0]).to.have.property('reference');
          expect(entry.reference_to_b[0].reference).to.be.an('array');
          expect(entry.reference_to_b[0].reference[0]).to.have.property('title');
          expect(entry.reference_to_b[0].reference[0].title).to.equal('One');
        });
      })
      .catch(function error(error) {
        console.error(error);
      });
  });
  it('16. limit', function() {
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
  it('17. skip', function() {
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
  it('18. exists()', function() {
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
});