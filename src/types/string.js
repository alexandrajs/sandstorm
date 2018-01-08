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
		throw new Error("too_short");
	}
	if (schema.max && length > schema.max) {
		throw new Error("too_long");
	}
	if (schema.pattern && !schema.pattern.test(value)) {
		throw new Error("not_match_pattern");
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
			throw new Error("Wrong property '" + key + "' type", "wrong_property_type");
		} else {
			value = value.valueOf();
		}
	}
	_set(model, target, set, schema, key, value);
}

/**
 *
 * @param model
 * @param target
 * @param schema
 * @param key
 * @param value
 */
function unset(model, target, schema, key, value) {
}

module.exports = {
	get: common.modelGet,
	set,
	unset
};
