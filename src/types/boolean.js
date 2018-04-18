/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");
const ExtError = require("exterror");
const Promise = require("bluebird");
/**
 *
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param key
 * @param value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	set[key] = target[key] = value;
	return Promise.resolve();
}

/**
 *
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param key
 * @param value
 * @returns {*}
 */
function set(model, target, set, schema, key, value) {
	if (value !== true && value !== false) {
		if (!(value instanceof Boolean)) {
			return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be boolean, got " + typeof value));
		}
		value = value.valueOf();
	}
	return _set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
