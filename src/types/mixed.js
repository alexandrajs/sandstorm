/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");
const ExtError = require("exterror");

/**
 *
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param key
 * @param path
 * @param value
 * @private
 */
function _set(model, target, set, schema, key, path, value) {
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
 * @param path
 * @param value
 * @returns {*}
 */
function set(model, target, set, schema, key, path, value) {
	if (value == null) {
		return Promise.reject(new ExtError("ERR_PROPERTY_TYPE_CANT_BE_NULL_OR_UNDEFINED", "Value of '" + path + "' can not be null or undefined"));
	}
	return _set(model, target, set, schema, key, path, value);
}

module.exports = {
	get: common.modelGet,
	set
};
