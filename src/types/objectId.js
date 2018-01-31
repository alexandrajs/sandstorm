/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");
const ObjectID = require("mongodb").ObjectID;

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
	if (typeof value === "string") {
		value = new ObjectID(value);
	}
	if (!(value instanceof ObjectID)) {
		throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
	}
	_set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
