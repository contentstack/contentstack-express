'use strict'

var request = require('request-promise')

var host = "http://localhost:5000"

module.exports = function (param) {
    param.method = 'GET'
    param.url = host + param.url
    return request(param)
}