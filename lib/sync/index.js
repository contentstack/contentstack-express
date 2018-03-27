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
var _ = require('lodash');

var config = utils.config;
var languages = config.get('languages');
module.exports = function() {
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
			rq_lock = false;

		// Test flag
		var _triggerReleaseTracker = false;

		// proceed next queue if present
		var next = function (entityStatus) {
			q_inProgress = false;
			// TODO: BUG fails here when return is 'null'
			// If entityStatus is an object, its prolly an object, that's part of a release
			if (typeof entityStatus === 'object' && entityStatus.hasOwnProperty('_release_uid')) {
				// Maintain a queue, only for the particular release
				// If there's no release with the UID, create its queue
				if (releases[entityStatus._release_uid])
					releases[entityStatus._release_uid].push(entityStatus);
				else
					releases[entityStatus._release_uid] = [entityStatus];
				// The processed entity, is the last object of the release
				if (entityStatus.hasOwnProperty('_isLast') && entityStatus._isLast) {
					var _release = _.cloneDeep(releases[entityStatus._release_uid]);
					// Delete the release from the release-queue
					// TODO: ponder on deleting after its status has been updated
					delete releases[entityStatus._release_uid];
					releaseManager(_release, false);
				}
			}
			// Start the process of updating the release status
			// simultaneously proceeding with publish-queue
			if (!q_inProgress) {
				if (q.length > 0) {
					sync.start(q.shift());
					q_inProgress = true;
				}
			}
		};

		// start sync-utility
		var sync = new Sync(next);

		next.bind(sync);

		/**
		 * Handle releases
		 * @param  {object}   release  	: Release object
		 * @param  {boolean}   action   : Insert(true) or remove(false)
		 * @param  {function} callback 	: If there's any error, return the error
		 * @return {function}            [description]
		 */
		var releaseManager = function (release, action) {
			try {
				// If action is insert(true) and release-queue is not under process, execute the current release
				// No need to eval release-lock
				if (action && !rq_lock) {
					rq_lock = true;
					// Fetch release details from Contentstack
					helper.fetchRelease(release, function (error, items) {
						// Sync should have error handling (else, it gets eaten up)
						if (error) {
							console.error('Error fetching release.');
							console.error(error);
							// Release the lock if there's an error while fetching the release
							rq_lock = false;
							if (release_q.length > 0) releaseManager(release_q.shift(), true);
						} else {
							console.log('\n@Added another release ' + release.entry.title + '(uid: ' + release.entry.uid + ') to release_q');
							// If a release isn't in progress, turn the release-queue flag to true
							// and start pushing the current items onto the publish-queue.
							// i.e. lock release-queue
							items.forEach(function (item) {
								console.log('@Added item (uid:' + item.uid + ', content_type_uid:(' + item.content_type_uid + ') to queue');
								// Add all items onto the publish-queue
								// Find the if the language is supported, else add it to unsupported list
								var _locale = _.find(languages, {code: item.locale});
								if (!_.isEmpty(_locale)) {
									var q_object = {
										lang: _locale,
										message: {
											body: {
												object: {
													entry: {
														title: item.title,
														version: item.version,
														entry_uid: item.uid
													},
													locale: [item.locale],
													action: item.action,
												},
												item: item
											}
										}
									};
									if (item.content_type_uid === 'built_io_upload') {
										q_object.message.body.object.type = 'asset';
									} else {
										q_object.message.body.object.type = 'entry';
										q_object.message.body.object.form = {
											form_uid: item.content_type_uid
										};
									}
									q.push(q_object);
								} else {
									item.status = -1;
									item.error = new Error(item.locale, ' language was not found in the current application.');
									if (releases[item._release_uid])
										releases[item._release_uid].push(item);
									else
										releases[item._release_uid] = [item];
								}
							});
							// Continue with the queue
							if (!q_inProgress) {
								if (q.length > 0) {
									sync.start(q.shift());
									q_inProgress = true;
								}
							}
						}
					});
				} else if (!action) {
					rq_lock = false;
					if (release_q.length > 0) releaseManager(release_q.shift(), true);
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
					for(var i = 0, _i = release_q.length; i < _i; i++) {
						if (release_q[i].entry.uid === release[0]._release_uid) {
							var _removed_release = release_q.splice(i, 1)[0];
							var _release = {
								items: release,
								name: _removed_release.entry.title,
								uid: _removed_release.uid
							};
							// Update the release status @Contentstack
							helper.updateRelease(_release);
							break;
						}
					}
				}
				// Continue with the queue
				if (!q_inProgress) {
					if (q.length > 0) {
						sync.start(q.shift());
						q_inProgress = true;
					}
				}
			} catch (error) {
				console.error('Release failed during processing.')
				console.error(error);
				rq_lock = false;
				if (release_q.length > 0) releaseManager(release_q.shift(), true);
			}
		}

		// synchronize all requests through queue
		var proceed = function (sync) {
			return function (message, locale) {
				if (message.type === 'release') {
					console.log(message.uid);
					// Add the current release to the release-queue
					release_q.push(message);
					releaseManager(message, true);
				} else {
					// Check if any release-queue is ongoing,
					// if yes, go through publish-queue
					// 		Find the fist element that has a release flag
					// 		and place the element right before its position
					// else, go on doing normal process
					if (rq_lock) {
						if (q.length > 0) {
							for (var i = 0, _i = q.length; i < _i; i++) {
								if (q[i].hasOwnProperty('_release_uid')) {
									q.splice(i, 0, {message: message, lang: locale});
									break;
								}
							}
						} else {
							/**
							 * Goes into this block during this:
							 * Error fetching release.
							 * {
							 * 		error_message: 'You\'re not allowed in here unless you\'re logged in.',
							 *   	error_code: 105,
							 *    errors: {
							 *    	authtoken: [ 'is not valid.' ]
							 *    }
							 * }
							 *
							 * Also, when a release is being fetched and in the meanwhile an entry/asset is published
							 */
							console.error('Release-queue flag is on, while publish-queue is empty.');
							q.push({message: message, lang: locale});
						}
						// Check for publish-queue lock
						if (!q_inProgress) {
							sync.start(q.shift());
							q_inProgress = true;
						}
					} else {
						q.push({message: message, lang: locale});
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