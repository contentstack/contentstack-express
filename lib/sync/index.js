/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const utils = require('../utils');
const helper = require('./helper');
const socket = require('./socket');
const Sync = require('./sync');
const _ = require('lodash');

const config = utils.config;
const languages = config.get('languages');
const language_codes = _.map(languages, 'code');

module.exports = function() {
	try {
		if (!(config.get('contentstack.api_key') && config.get('contentstack.access_token'))) {
			throw new Error('Contentstack details are missing.');
		}

		// initialize queue array
		let q = [];
		// Ideally in releases, there should be only one object
		let releases = {};
		// publish-queue
		let q_inProgress = false;

		let release_q = [];
		let rq_lock = false;

		const next = function (entityStatus) {
			if (entityStatus && typeof entityStatus === 'object' && entityStatus.hasOwnProperty('_release_uid')) {
				if (releases[entityStatus._release_uid])
					releases[entityStatus._release_uid].push(entityStatus);
				else
					releases[entityStatus._release_uid] = [entityStatus];

				if (entityStatus.hasOwnProperty('_isLast') && entityStatus._isLast) {
					const _release = _.cloneDeep(releases[entityStatus._release_uid]);
					// Delete the release from the release-queue
					delete releases[entityStatus._release_uid];
					releaseManager(_release, false);
				}
			}

			q_inProgress = false;
			if (!q_inProgress) {
				if (q.length > 0) {
					sync.start(q.shift());
					q_inProgress = true;
				}
			}
		};

		// start sync-utility
		const sync = new Sync(next);
		next.bind(sync);

		const clearQueues = function (queue) {
			if (typeof queue !== 'string') {
				console.error(`Clearning queues failed. Query parameter should be of type 'string'.`);
			}
			switch (queue) {
				case 'release':
					release_q = [];
					rq_lock = false;
					console.log('Release queue has been re-set');
					break;
				case 'q':
					q = [];
					q_inProgress = false;
					console.log('Express queue has been re-set');
					break;
				case 'all':
				default:
					release_q = [], q = [];
					rq_lock = false, q_inProgress = false;
					console.log('Express release_queue & queue has been re-set');
					break;
			}
		}

		/**
		 * Handles fetching and processing of releases
		 * @param  {object}   release  	: Release object
		 * @param  {boolean}   action   : Insert(true) or remove(false)
		 */
		const releaseManager = function (release, action) {
			try {
				// If action is insert(true) and release-queue is not under process, execute the current release
				if (action && !rq_lock) {
					rq_lock = true;
					// Fetch release details from Contentstack
					helper.fetchRelease(release, function (error, items) {
						try {
							if (error) {
								console.error('Error fetching release.');
								console.error(error);
								release_q.shift();
								rq_lock = false;
								if (release_q.length > 0) releaseManager(release_q[0], true);
							} else {

								const last_index = _.findLastIndex(items, function (item) {
									return language_codes.indexOf(item.locale) !== -1;
								});

								if (~last_index) {
									// flag the last item to be processed
									items[last_index]._isLast = true;
									items.forEach(function (item) {

										item._release_uid = (release.entry.hasOwnProperty('uid')) ? release.entry.uid: release.entry.entry_uid;

										const _locale = _.find(languages, {code: item.locale});
										if (!_.isEmpty(_locale)) {
											const q_object = {
												lang: _locale,
												message: {
													body: {
														object: {
															entry: {
																title: item.title,
																version: item.version,
																entry_uid: item.uid,
																locale: (item.hasOwnProperty('entry_locale')) ? item.entry_locale: item.locale
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
											item.status = 3;
											item.error = `${item.locale} language was not found in the current application.`;
											if (releases[item._release_uid]) {
												releases[item._release_uid].push(item);
											} else {
												releases[item._release_uid] = [item];
											}
										}
									});
								} else {
									// In case all items in the deployment have lanugages, that isn't supported by the current instance
									items.forEach(function (item) {
										item._release_uid = release.entry.uid || release.entry.entry_uid;
										item.status = 3;
										item.error = `${item.locale} language was not found in the current application.`;
									});
									releaseManager(items, false);
								}

								// Continue with the queue
								if (!q_inProgress) {
									if (q.length > 0) {
										sync.start(q.shift());
										q_inProgress = true;
									}
								}
							}
						} catch (error) {
							console.error('Error at releases processing.');
							console.error(error);
							rq_lock = false;
							if (_.isArray(release_q)) {
								if (release_q.length > 0) {
									releaseManager(release_q[0], true);
								}
							} else {
								// If something is wrong with release queue, reset its object
								release_q = [];
							}
						}
					});
				} else if (!action) {
					// Release has completed processing
					// Update the release status @Contentstack
					helper.updateRelease({
						items: release,
						uid: release_q.shift().uid
					});

					rq_lock = false;
					if (release_q.length > 0) {
						releaseManager(release_q[0], true);
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
				if (release_q.length > 0) {
					releaseManager(release_q[0], true);
				}
			}
		}

		// synchronize all requests through queue
		const proceed = function (sync) {
			return function (message, locale) {
				if (message.type === 'release') {
					// Add the current release to the release-queue
					release_q.push(_.cloneDeep(message));
					releaseManager(message, true);
				} else {
					// Check if any release-queue is ongoing,
					if (rq_lock) {
						if (q.length > 0) {
							for (let i = 0, _i = q.length; i < _i; i++) {
								if (q[i].message.body.hasOwnProperty('item') &&  q[i].message.body.item.hasOwnProperty('_release_uid')) {
									q.splice(i, 0, {message: message, lang: locale});
									break;
								}
							}
						} else {
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

		socket(proceed, clearQueues);
	} catch (syncError) {
		console.error('Sync ran into an error.')
		console.error(syncError);
		process.exit(0);
	}
}