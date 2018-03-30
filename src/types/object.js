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
	fast.object.forEach(value, (item, target_key) => {
		if (!schema.properties.hasOwnProperty(target_key)) {
			throw new ExtError("ERR_KEY_NOT_ALLOWED", "Key '" + target_key + "' in '" + key + "' in not allowed ");
		}
		const type = schema.properties[target_key].type;
		const item_schema = schema.properties[target_key];
		common.setTargetItem({
			types,
			model,
			set,
			target,
			target_key,
			item,
			item_schema,
			type,
			key,
			value
		});
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
		throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + key + "' to be plain object");
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
