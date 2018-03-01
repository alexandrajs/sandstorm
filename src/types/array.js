/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const types = require("./index");
const fast = require("fast.js");
const common = require("../common");
const Model = require("../model");
const ExtError = require("exterror");

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
		throw new ExtError("ERR_ARRAY_TOO_SHORT");
	}
	if (schema.max && length > schema.max) {
		throw new ExtError("ERR_ARRAY_TOO_LONG");
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
			throw new ExtError("ERR_WRONG_PROPERTY_TYPE");
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
		throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be instance of Array, got " + typeof value);
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
