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
	if (value === null || value === undefined) {
		return Promise.reject(new ExtError("ERR_PROPERTY_TYPE_CANT_BE_NULL_OR_UNDEFINED", "Value of '" + key + "' can not be null or undefined"));
	}
	return _set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
