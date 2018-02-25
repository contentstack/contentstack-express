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
	Sync = require('./sync');

var config = utils.config;

function Sync () {
	try {
		if (!(config.get('contentstack.api_key') && config.get('contentstack.access_token'))) {
			throw new Error("Built.io Contentstack details are missing.");
		}

		// initialize queue array
		var q = [],
			// Ideally in releases, there should be only one object
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
					releaseManager(_release, false);
				}
			}
			// Start the process of updating the release status
			// simultaneously proceeding with publish-queue
			if (!q_inProgress) {
				if (q.length > 0) {
					var published_object = q.shift();
					if (published_object.hasOwnProperty('_release_uid'))
						rq_inProgress = true;
					sync.start(published_object);
					q_inProgress = true;
				}
			}
		};

		// start sync-utility
		var sync = new Sync(next);

		next.bind(sync);

		// TODO: Remove this.
		// USE ONLY FOR TESTING
		function triggerReleaseTracker () {
			// Log release_queue every 60 seconds!
			setInterval(function () {
				console.log('__________ Start _________');
				var _release = '';
				release_q.forEach(function (release) {
					_release += release.release.entry.title + '(' + release.release.entry.uid + '), ';
				});
				console.log('Releases in progress:', _release);
				console.log('Release in process:', Object.keys(releases));
				console.log('__________ END __________');
			}, 60000);
			_triggerReleaseTracker = true;
		}

		/**
		 * Handle releases
		 * @param  {object}   release  	: Release object
		 * @param  {boolean}   action   : Insert(true) or remove(false)
		 * @param  {function} callback 	: If there's any error, return the error
		 * @return {function}            [description]
		 */
		var releaseManager = function (release, action, callback) {
			try {
				// Invoke it once
				if (!_triggerReleaseTracker)
					triggerReleaseTracker();
				// If action is insert(true) and release-queue is not under process, execute the current release
				if (action && !rq_lock) {
					// Fetch release details from Contentstack
					helper.fetchRelease(message, function (error, items) {
						// Sync should have error handling (else, it gets eaten up)
						if (error)
							sync.error(error);
						// Add the current release to the release-queue
						release_q.push(message);
						// If a release isn't in progress, turn the release-queue flag to true
						// and start pushing the current items onto the publish-queue.
						// i.e. lock release-queue
						rq_lock = true;
						items.forEach(function (item) {
							// Add all items onto the publish-queue
							q.push({message: item, lang: item.locale});
						});
						// Release release-queue
						rq_lock = false;
					});
				} else if (action) {
					// If a release-queue is in progress, simply add the release to the queue
					release_q.push(release);
				} else if (!action) {
					// Release has completed processing
					// If there's any left on the current release-queue, process it
					// else, call next item on the queue and update status of the release

					// TODO: Check before and after, if publish-queue is in progress
					// (we do not want to lose time processing while a call is being made)

					// Remove current release from the queue
					// USE ONLY FOR TESTING
					console.log('Completed processing queue:', release[0]._release_uid);
					console.log('Release details..');
					// This loop may not be required.
					// Release being popped should be on top of the queue
					for(var i = 0, _i = release_q.length, i < _i; i++) {
						if (release_q[i].release.entry.uid === release[0]._release_uid) {
							console.log(JSON.stringify(release_q.splice(i, 1)));
							break;
						}
					}
					if (release_q.length > 0)
						releaseManager(release_q.shift(), true);
					// Update the release status @Contentstack
					// TODO: keep only one request, instead of making a new method for each release
					helper.updateRelease(release);
				}
				// Continue with the queue
				if (!q_inProgress) {
					if (q.length > 0) {
						var published_object = q.shift();
						if (published_object.hasOwnProperty('_release_uid'))
							rq_inProgress = true;
						sync.start(published_object);
						q_inProgress = true;
					}
				}
				// Don't wait for processing
				callback(null);
			} catch (error) {
				console.error('Release failed during processing.')
				console.error(error);
				// Log error, but do not let it block the publish/release queue
				callback(null);
			}
		}

		// synchronize all requests through queue
		var proceed = function (sync) {
			return function (message, locale) {
				if (message.type === 'release') {
					releaseManager(message, true, function (error) {
						if (!q_inProgress) {
							if (q.length > 0) {
								var published_object = q.shift();
								if (published_object.hasOwnProperty('_release_uid'))
									rq_inProgress = true;
								sync.start(published_object);
								q_inProgress = true;
							}
						}
					});
				} else {
					// Check if any release-queue is ongoing,
					// if yes, go through publish-queue
					// 		Find the fist element that has a release flag
					// 		and place the element right before its position
					// else, go on doing normal process
					if (rq_inProgress) {
						if (q.length > 0) {
							for (var i = 0; _i = q.length; i < _i; i++) {
								if (q[i].hasOwnProperty('_release_uid')) {
									q.splice(i, 0, {message: message, locale: locale});
									break;
								}
							}
						} else {
							console.error('Release-queue flag is on, while publish-queue is empty. Something\'s off.');
							q.push({message: message, locale: locale});
						}
						// Check for publish-queue lock
						if (!q_inProgress) {
							var published_object = q.shift();
							if (published_object.hasOwnProperty('_release_uid'))
								rq_inProgress = true;
							sync.start(published_object);
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
	} catch (syncError) {
		console.error('Sync ran into an error.')
		console.error(syncError);
		process.exit(0);
	}
}