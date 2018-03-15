/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("../common");

/**
 *
 * @param options
 * @constructor
 */
function ObjectProperty(options) {
	options.properties = options.properties || {};
	this.type = "Object";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
	this.properties = common.isEmpty(options.properties) ? undefined : options.properties;
}

module.exports = ObjectProperty;
