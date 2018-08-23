var fs = require('fs');
var path = require('path');

module.exports = readdir = function (path) {
	try {
		if (fs.existsSync(path)) {
			return fs.readdirSync(path);
		} else {
			return [];
		}
	} catch (error) {
		console.error(error);
		return [];
	}
}

module.exports = readfile = function (path, parse) {
	try {
		if (fs.existsSync(path)) {
			var data = fs.readFileSync(path);
			if (parse) {
				return JSON.parse(data);
			} else {
				return data;
			}
		} else {
			if (parse) {
				return {};
			} else {
				return '';
			}
		}
	} catch (error) {
		console.error(error);
	}
}