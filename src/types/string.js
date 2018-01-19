/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");

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
		throw new RangeError("ERR_STRING_TOO_SHORT");
	}
	if (schema.max && length > schema.max) {
		throw new RangeError("ERR_STRING_TOO_LONG");
	}
	if (schema.pattern && !schema.pattern.test(value)) {
		throw new Error("ERR_STRING_NOT_MATCH_PATTERN");
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
			throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
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
