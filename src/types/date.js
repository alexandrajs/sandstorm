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
 * @param value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	set[key] = target[key] = new Date(value.toJSON());
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
	if (!(value instanceof Date)) {
		throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be instance of Date, got " + typeof value);
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
