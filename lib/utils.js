/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

const Q = require('q'),
    _ = require('lodash');

let pkg = require('./../package.json'),
    utils = require('./utils/index'),
    log = utils.sync,
    config = require('./config')();

/*
 * Application defined variables
 * */
let request = require('./request'),
    limit = 100,
    api;


class Utility{
    constructor(skip){
         if (!skip) {
             api = config.get('contentstack');
        }
    }

    /*
     *initialize config details
     * */
    init(){
       let self = this;
        api = config.get('contentstack');
        self.headers = {
            api_key: config.get('contentstack.api_key'),
            access_token: config.get('contentstack.access_token'),
            "X-User-Agent": 'contentstack-cli/' + pkg.version
        } 
    }

    /*
 * Get the entries from the provided ContentType from the configured stack
 * */
    getEntries(content_type, locale, _query, fields, environment){
        let self = this,
            _getEntries,
            deferred = Q.defer(),
            _json = {
            _method: "GET",
            locale: locale,
            limit: limit,
            desc: "created_at",
            query: _query,
            only: {
                BASE: fields || []
            }
            };
        if (_.isString(environment)) _json['environment'] = environment;
        _getEntries = (skip) => {
            let options = {
                url: api.host + '/' + api.version + api.urls.content_types + content_type + api.urls.entries,
                headers: self.headers,
                method: "POST",
                json: _json
            };
            if (!skip) options.json.include_count = true;
            _json['skip'] = skip;
            return request(options);
        };

        _getEntries(0)
            .then( (data) => {
                let _calls = [];
                if (data && data.entries && data.count && data.count > limit) {
                    for (let i = 1, total = Math.ceil(data.count / limit); i < total; i++) {
                        _calls.push(_getEntries((limit * i), locale, _query))
                    }
                    Q.all(_calls)
                        .then( (entries) => {
                            entries = _.map(entries, "entries").reduce( (prev, crnt) => {
                                if (Array.isArray(crnt)) {
                                    prev = prev.concat(crnt);
                                }
                                return prev;
                            }, []);
                            data.entries = data.entries.concat(entries);
                            deferred.resolve(data.entries);
                        });
                } else {
                    deferred.resolve(data.entries);
                }
            })
            .fail( (error) => {
                log.error('Get Entries Error: ', JSON.stringify(error));
            });

        return deferred.promise;
   }
/*
 * Get all the ContentTypes from the configured stack
 * */
   getContentTypes(){
        return request({
            url: api.host + '/' + api.version + api.urls.content_types,
            qs: {desc: "created_at"},
            headers: this.headers,
            method: "GET",
            json: true
        });
   }

/*
 * Get the specified environment from the configured stack
 * */
   getEnvironment(environment){
     return request({
        url: api.host + '/' + api.version + api.urls.environments + environment,
        headers: this.headers,
        method: "GET",
        json: true
      });
   }

/*
 * Get all the Assets from the configured stack
 * */
   getAssets(options){
        return request({
        method: "GET",
        url: api.host + '/' + api.version + api.urls.assets,
        qs: options,
        headers: this.headers,
        json: true
    });
   }

/*
 * Get the specified environment from the configured stack
 * */
   getStack(headers){
        return request({
        url: api.host + '/' + api.version + api.urls.stacks,
        headers: headers || this.headers,
        method: "GET",
        qs: {
            "include_discrete_variables": true
        },
        json: true
     });
   }

   matchConfirm(confirm){
        let regExp = new RegExp('(yes|y)', 'i');
    return (confirm) ? regExp.test(confirm) : undefined;
   }

}

module.exports = Utility;
