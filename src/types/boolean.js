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
 * @param key
 * @param value
 * @private
 */
function _set(model, target, set, schema, key, value) {
	set[key] = target[key] = value;
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
	if (value !== true && value !== false) {
		if (!(value instanceof Boolean)) {
			throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
		}
		value = value.valueOf();
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
