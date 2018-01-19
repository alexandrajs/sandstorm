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
 * @param {number} value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	if (schema.min !== undefined && value < schema.min) {
		throw new RangeError("ERR_NUMBER_LOWER_THAN_ALLOWED");
	}
	if (schema.max !== undefined && value > schema.max) {
		throw new RangeError("ERR_NUMBER_GREATER_THAN_ALLOWED");
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
 * @param {number} value
 * @returns {*}
 */
function set(model, target, set, schema, key, value) {
	if (typeof value !== "number" || value !== value) {
		if (!(value instanceof Number)) {
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
