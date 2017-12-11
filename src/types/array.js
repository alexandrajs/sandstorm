/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const types = require("./index");
const fast = require("fast.js");
const common = require("../common");
const Model = require("../model");

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
	return fast.cloneArray(target[key]);
}

/**
 *
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param {string} key
 * @param {Array} value
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
	const type = schema.item.type;
	if (type !== "Mixed") {
		set[key] = [];
		target[key] = [];
		fast.forEach(value, (item, targetKey) => {
			if (type in types) {
				return types[type].set(model, target[key], set[key], schema.item, targetKey, item);
			}
			if (type in model.orm.schemas) {
				if (common.isPlainObject(item)) {
					item = new Model(model.orm, type, item);
				}
				if (item instanceof Model) {
					if (item.name === type) {
						target[key][targetKey] = item;
						set[key][targetKey] = item;
						return;
					}
				}
			}
			throw new TypeError("Wrong property '" + key + "' type '" + type + "'", "wrong_property_type");
		});
		return;
	}
	set[key] = target[key] = fast.cloneArray(value);
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
	if (!(value instanceof Array)) {
		throw new Error("Wrong property '" + key + "' type", "wrong_property_type");
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
