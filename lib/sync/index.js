/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var utils = require('../utils'),
	helper = require('./helper'),
	socket = require('./socket'),
	request = require('request'),
	Sync = require('./sync');

var config = utils.config;

module.exports = function () {
	try {
		if (!(config.get('contentstack.api_key') && config.get('contentstack.access_token'))) {
			throw new Error("Built.io Contentstack details are missing.");
		}

		// initialize queue array
		var q = [],
			releases = {},
			// publish-queue
			q_inProgress = false;

		var release_q = [],
			// release-queue
			rq_inProgress = false;

		// Test flag
		var _triggerReleaseTracker = false;
		
		// proceed next queue if present
		var next = function (entityStatus) {
			var self = this;
			// If entityStatus is an object, its prolly an object, that's part of a release
			if (typeof entityStatus === 'object' && entityStatus.hasOwnProperty('_release_uid')) {
				// Maintain a queue, only for the particular release
				// If there's no release with the UID, create its queue
				if (releases[entityStatus._release_uid])
					releases[entityStatus._release_uid] = [entityStatus];
				else
					releases[entityStatus._release_uid].push(entityStatus);
				// The processed entity, is the last object of the release
				if (entityStatus.hasOwnProperty('_isLast') && entityStatus._isLast) {
					var _release = _.cloneDeep(releases[entityStatus._release_uid]);
					// Delete the release from the release-queue
					// TODO: ponder on deleting after its status has been updated
					delete releases[entityStatus._release_uid];
					rq_inProgress = false;
					// TODO: Remove this.
					// USE ONLY FOR TESTING
					for (var i = 0; _i = release_q.length; i < _i; i++) {
						// If it matches, delete element from that position
						if (release_q.entry.uid === entityStatus._release_uid) {
							console.log('Removed release from release-queue', JSON.stringify(release_q.splice(i, 1)));
							break;
						}
					}
					// Start the process of updating the release status
					// simultaneously proceeding with publish-queue
					if (q.length > 0)
						self.start(q.shift());
					else
						q_inProgress = false;
					// TODO: keep only one request, instead of making a new method for each release
					helper.updateRelease(_release);
				}
			} else {
				if (q.length > 0) {
					var element = q.shift();
					// If the element in progress is part of a release, switch the release-queue flag
					// TODO: 
					// Let's say, while a release elements are being added : This will break its lock!
					// Update: does the lock there make sense?
					if (element._release_uid)
						rq_inProgress = true;
					this.start();
				} else {
					q_inProgress = false;
				}
			}
		};

		// start sync-utility
		var sync = new Sync(next);

		next.bind(sync);

		// TODO: Remove this.
		// USE ONLY FOR TESTING
		function triggerReleaseTracker () {
			if (_triggerReleaseTracker) {
				// Log release_queue every 40 seconds!
				setInterval(function () {
					console.log('___________________________ Start _____________________________');
					console.log(JSON.stringify(release_q));
					console.log('Do the release_q match release-queue?', (release_q.length === Object.keys(releases).length) ? true: false);
					console.log('____________________________ END _______________________________');
				}, 60000);
			}
		}

		// synchronize all requests through queue
		var proceed = function (sync) {
			return function (message, locale) {
				if (message.type === 'release') {
					triggerReleaseTracker();
					helper.fetchRelease(message, function (error, items) {
						// Sync should have error handling (else, it gets eaten up)
						if (error)
							sync.error(error);
						release_q.push(message);
						// If a release isn't in progress, turn the release-queue flag to true
						// and start pushing the current items onto the publish-queue.
						// i.e. lock release-queue
						if (!rq_inProgress) {
							rq_inProgress = true;
							items.forEach(function (item) {
								// Add all items onto the publish-queue
								q.push({message: item, lang: item.locale});
							});
							// Release release-queue
							rq_inProgress = false;
						}

						if (!q_inProgress) {
							sync.start(q.shift());
							q_inProgress = true;
						}
					});
				} else {
					// Go through publish-queue
					// Find the fist element that has a release flag
					// and place the element right before its position
					if (!rq_inProgress) {
						for (var i = 0; _i = q.length; i < _i; i++) {
							if (q[i].hasOwnProperty('_release_uid')) {
								q.splice(i, 0, {message: message, locale: locale});
								break;
							}
						}
						if (!q_inProgress) {
							sync.start(q.shift());
							q_inProgress = true;
						}
					} else {
						q.push({"message": message, "lang": locale});
						if (!q_inProgress) {
							sync.start(q.shift());
							q_inProgress = true;
						}
					}
				}
			};
		}.call(null, sync);

		socket(proceed);

	} catch (e) {
		console.error("Could not start the server. Error: " + e.message);
		process.exit(0);
	}
};