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
		throw new Error("Wrong property '" + key + "' type '" + typeof value + "'", "wrong_property_type");
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
	get: common.modelGet,
	set,
	unset
};
