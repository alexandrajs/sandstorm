/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const MixedProperty = require("./mixed");

/**
 *
 * @param options
 * @constructor
 */
function ArrayProperty(options) {
	if (options.length !== undefined) {
		options.min = options.max = options.length;
	}
	this.type = "Array";
	this.required = options.required || false;
	this.default = options.default;
	this.item = options.item !== undefined ? options.item : new MixedProperty({type: "Mixed"});
	this.min = options.min;
	this.max = options.max;
}

module.exports = ArrayProperty;
