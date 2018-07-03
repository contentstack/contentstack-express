/**
 * Module dependencies.
 */
const _ = require('lodash');

let helper = module.exports = {};

// remove extra and unwanted keys from entry object
helper.deleteKeys = (_entry) => {
    let keys = ["ACL", "publish_details"],
        entry = _entry.object || _entry,
        d = new Date();

    entry.uid = (entry._metadata && entry._metadata.uid) ? entry._metadata.uid : entry.uid;
    entry.published_at = d.toISOString();
    return _.omit(entry, keys);
};

// get message
helper.message = (err) => {
    if (typeof err == "object") {
        if (err.message) {
            return JSON.stringify(err.message);
        } else if (err.error_message) {
            return JSON.stringify(err.error_message);
        }
        return JSON.stringify(err);
    }
    return err;
};