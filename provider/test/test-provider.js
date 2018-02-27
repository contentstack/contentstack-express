const Provider = require('contentstack-provider');
const EventEmitter = require('events').EventEmitter;

const amul = require('./data/en-us/data/amul');
const schema = require('./data/en-us/data/_content_types');
const assets = require('./data/en-us/assets/_assets');
const routes = require('./data/en-us/data/_routes');

const data = {
	d1: {
		_uid: amul[0]._uid,
		_content_type_uid: 'amul',
		_locale: 'en-us',
		entry: amul[0]._data,
		content_type: schema[0]._data
	},
	d2: {
		_uid: amul[1]._uid,
		_content_type_uid: 'amul',
		_locale: 'en-us',
		entry: amul[1]._data,
		content_type: schema[0]._data
	},
	d3: {
		_uid: amul[2]._uid,
		_content_type_uid: 'amul',
		_locale: 'en-us',
		entry: amul[2]._data,
		content_type: schema[0]._data
	}
}

const assets_metadata = {
	rte1: {
		_uid: 'blt634a9f7c9c06e242',
		_content_type_uid: '_assets',
		_locale: 'en-us',
		asset: {
			"uid": "blt634a9f7c9c06e242e",
			"url": "https://images.contentstack.io/v3/assets/blt0a3e0fa8bf2766a9/blt634a9f7c9c06e242/5a182ba21be39137079a632e/download",
			"download_id": "blt634a9f7c9c06e242/5a182ba21be39137079a632e/download",
			"filename": "squirttle.jpg",
			"_internal_url": "/assets/blt634a9f7c9c06e242/squirttle.jpg"
		}
	},
	rte2: {
		_uid: assets[4]._uid,
		_content_type_uid: '_assets',
		_locale: 'en-us',
		asset: assets[4]._data
	},
	a1: {
		_uid: assets[0]._uid,
		_content_type_uid: '_assets',
		_locale: 'en-us',
		asset: assets[0]._data
	}
}

class Parent extends EventEmitter {
	constructor () {
		super();
	}

	publish (data) {
		this.emit('publish', data, cb => {
			console.log(`Return from publish: ${JSON.stringify(cb)}`);
		});
	}

	downloadAssets (data) {
		this.emit('downloadAssets', data, cb => {
			console.log(`Return from publish: ${cb.error}`);
		});
	}
}

const parent_instance = new Parent();
const provider_instance = new Provider(parent_instance);

// parent_instance.publish(data.d1);
parent_instance.downloadAssets(assets_metadata.rte1);