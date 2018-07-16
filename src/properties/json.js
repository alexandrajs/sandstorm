/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const MixedProperty = require("./mixed");

/**
 * Wraps property type in item
 * @param options
 * @constructor
 */
function JSONProperty(options) {
	this.type = "JSON";
	this.required = options.required || false;
	this.default = options.default;
	this.item = options.item !== undefined ? options.item : new MixedProperty({type: "Mixed"});
}

module.exports = JSONProperty;
