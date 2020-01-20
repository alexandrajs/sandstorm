/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const types = require("./index");
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
 * @param {Object} value
 * @private
 */
function _set(model, target, set, schema, key, path, value) {
	if (!schema.properties || common.isEmpty(schema.properties)) {
		target[key] = set[key] = Object.assign({}, value);
		return Promise.resolve();
	}
	if (model.overwrite || !common.isPlainObject(target[key])) {
		target[key] = {};
		set[key] = {};
	} else {
		set[key] = Object.assign({}, target[key]);
		target[key] = Object.assign({}, target[key]);
	}
	const _await = [];
	Object.entries(value).forEach(([target_key, item]) => {
		if (!schema.properties.hasOwnProperty(target_key)) {
			return _await.push(Promise.reject(new ExtError("ERR_KEY_NOT_ALLOWED", "Key '" + target_key + "' in '" + path + "' in not allowed ")));
		}
		const type = schema.properties[target_key].type;
		const item_schema = schema.properties[target_key];
		_await.push(common.setTargetItem({
			types,
			model,
			set,
			target,
			target_key,
			item,
			item_schema,
			type,
			key,
			path: path ? path + "." + target_key : target_key,
			value
		}));
	});
	return Promise.all(_await);
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
	if (!common.isPlainObject(value)) {
		return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + path + "' to be plain object"));
	}
	return _set(model, target, set, schema, key, path, value);
}

module.exports = {
	get: common.modelGet,
	set
};
