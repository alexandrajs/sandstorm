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
 * @param {string} key
 * @param {string} value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	const length = value.length;
	if (schema.min && length < schema.min) {
		return Promise.reject(new ExtError("ERR_STRING_TOO_SHORT", "Expected value of '" + key + "' to be longer than " + schema.min + ", got " + length));
	}
	if (schema.max && length > schema.max) {
		return Promise.reject(new ExtError("ERR_STRING_TOO_LONG", "Expected value of '" + key + "' to be shorter than " + schema.max + ", got " + length));
	}
	if (schema.pattern && !schema.pattern.test(value)) {
		return Promise.reject(new ExtError("ERR_STRING_NOT_MATCH_PATTERN", "Value of '" + key + "' do not match pattern " + schema.pattern));
	}
	if(Array.isArray(schema.oneOf) && !~schema.oneOf.indexOf(value)) {
		return Promise.reject(new ExtError("ERR_STRING_NOT_ONE_OF", "Value of '" + key + "' is not one of '" + schema.oneOf + "'"));
	}
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
	if (typeof value !== "string") {
		if (!(value instanceof String)) {
			return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be 'string', got " + typeof value));
		} else {
			value = value.valueOf();
		}
	}
	return _set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
