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
 * @param {number} value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	if (schema.min !== undefined && value < schema.min) {
		throw new ExtError("ERR_NUMBER_LOWER_THAN_ALLOWED", "Expected value of '" + key + "' to be greater than " + schema.min + ", got " + value);
	}
	if (schema.max !== undefined && value > schema.max) {
		throw new ExtError("ERR_NUMBER_GREATER_THAN_ALLOWED", "Expected value of '" + key + "' to be lower than " + schema.min + ", got " + value);
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
			throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be number, got " + typeof value);
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
