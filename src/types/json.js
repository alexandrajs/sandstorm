/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");
const types = require("./index");

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
	return types[schema.item.type].set(model, target, set, schema, key, value);
}

module.exports = {
	get: common.modelGet,
	set
};
