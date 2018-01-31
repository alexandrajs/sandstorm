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
 * @param model
 * @param target
 * @param set
 * @param schema
 * @param {string} key
 * @param {Object} value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	if (!schema.properties || common.isEmpty(schema.properties)) {
		target[key] = set[key] = fast.object.clone(value);
		return;
	}
	set[key] = {};
	target[key] = {};
	fast.object.forEach(value, (item, targetKey) => {
		if (!schema.properties.hasOwnProperty(targetKey)) {
			throw new RangeError("ERR_KEY_NOT_ALLOWED");
		}
		const type = schema.properties[targetKey].type;
		if (type in types) {
			return types[type].set(model, target[key], set[key], schema.properties[targetKey], targetKey, item);
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
		throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
	});
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
	if (!value || !common.isPlainObject(value)) {
		throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
