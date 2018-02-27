const _ = require('lodash'),
	Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs'), {suffix: 'Promise'}),
	sift = require('sift');

let utility = null;

class Utility {
	constructor () {
		if (!utility)
			utility = this;
		return utility;
	}

	/**
	 * Returns a random number between min (inclusive) and max (exclusive)
	 */
	getRandomNumber (min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}
}

module.exports = new Utility();