var fs = require('fs');
var path = require('path');
var marked = require('marked');

var data_dir = path.join(__dirname, 'markdown-contents');
var data_samples = [];

describe('Test markdown', function () {
	this.timeout(5000);
	before(function loadData () {
		var files = utils.readdir(data_dir);
		files.forEach(function (file) {
			// false: do not parse data
			data_samples.push(utils.readfile(path.join(data_dir, file), false));
		});
	});
});