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
	if (schema.min !== undefined && value < schema.min) {
		throw new Error("too_short");
	}
	if (schema.max !== undefined && value > schema.max) {
		throw new Error("too_long");
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
