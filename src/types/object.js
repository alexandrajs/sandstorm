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
	return fast.object.clone(target[key]);
}

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
		//console.warn(schema);
		return;
	}
	set[key] = {};
	target[key] = {};
	if(schema.properties === undefined) {
		set[key] = target[key] = value;
		return;
	}
	fast.object.forEach(value, (item, targetKey) => {
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
		throw new TypeError("Wrong property '" + targetKey + "' type, expected '" + type + "'", "wrong_property_type");
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
	if (!common.isPlainObject(value)) {
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
