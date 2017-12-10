/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param target
 * @param schema
 * @param key
 * @returns {*}
 */
function get(target, schema, key) {
	if (target[key] === undefined) {
		if (schema.required) {
			if (schema.default !== undefined) {
				return typeof schema.default === "function" ? schema.default() : schema.default;
			}
			throw new Error("missing_property");
		}
		return;
	}
	return target[key];
}

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
		if (!(value instanceof String)) {
			throw new Error("Wrong property '" + key + "' type", "wrong_property_type");
		} else {
			value = parseFloat(value);
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
	get,
	set,
	unset
};
