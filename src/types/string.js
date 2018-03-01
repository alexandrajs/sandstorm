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
 * @param {string} key
 * @param {string} value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	const length = value.length;
	if (schema.min && length < schema.min) {
		throw new ExtError("ERR_STRING_TOO_SHORT", "Expected value of '" + key + "' to be longer than " + schema.min + ", got " + length);
	}
	if (schema.max && length > schema.max) {
		throw new ExtError("ERR_STRING_TOO_LONG", "Expected value of '" + key + "' to be shorter than " + schema.max + ", got " + length);
	}
	if (schema.pattern && !schema.pattern.test(value)) {
		throw new ExtError("ERR_STRING_NOT_MATCH_PATTERN", "Value of '" + key + "' do not match pattern " + schema.pattern);
	}
	set[key] = target[key] = value;
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
			throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be 'string', got " + typeof value);
		} else {
			value = value.valueOf();
		}
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
