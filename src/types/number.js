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
 * @param path
 * @param {number} value
 * @private
 */
function _set(model, target, set, schema, key, path, value) {
	if (schema.min !== undefined && value < schema.min) {
		return Promise.reject(new ExtError("ERR_NUMBER_LOWER_THAN_ALLOWED", "Expected value of '" + path + "' to be greater than " + schema.min + ", got " + value));
	}
	if (schema.max !== undefined && value > schema.max) {
		return Promise.reject(new ExtError("ERR_NUMBER_GREATER_THAN_ALLOWED", "Expected value of '" + path + "' to be lower than " + schema.min + ", got " + value));
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
 * @param path
 * @param {number|*} value
 * @returns {*}
 */
function set(model, target, set, schema, key, path, value) {
	if (typeof value === "string" && value.trim().length && schema.coerce) {
		value = +value;
	}
	if (value !== value) {
		return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + path + "' to be number, got NaN"));
	}
	if (typeof value !== "number") {
		if (!(value instanceof Number)) {
			return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + path + "' to be number, got " + typeof value));
		} else {
			value = value.valueOf();
		}
	}
	return _set(model, target, set, schema, key, path, value);
}

module.exports = {
	get: common.modelGet,
	set
};
