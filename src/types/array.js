/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const types = require("./index");
const fast = require("fast.js");
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
 * @param {Array} value
 * @private
 */
function _set(model, target, set, schema, key, path, value) {
	const length = value.length;
	if (schema.min && length < schema.min) {
		return Promise.reject(new ExtError("ERR_ARRAY_TOO_SHORT"));
	}
	if (schema.max && length > schema.max) {
		return Promise.reject(new ExtError("ERR_ARRAY_TOO_LONG"));
	}
	const type = schema.item.type;
	if (type === "Mixed") {
		set[key] = target[key] = fast.cloneArray(value);
		return Promise.resolve();
	}
	set[key] = [];
	target[key] = [];
	return Promise.all(fast.array.map(value, (item, target_key) => {
		return common.setTargetItem({
			types,
			model,
			set,
			target,
			target_key,
			item,
			item_schema: schema.item,
			type,
			key,
			path: path + "." + target_key,
			value
		});
	}));
}

/**
 *
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param key
 * @param path
 * @param value
 * @returns {*}
 */
function set(model, target, set, schema, key, path, value) {
	if (!(value instanceof Array)) {
		return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be instance of Array, got " + typeof value));
	}
	return _set(model, target, set, schema, key, path, value);
}

module.exports = {
	get: common.modelGet,
	set
};
