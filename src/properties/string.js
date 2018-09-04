/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function StringProperty(options) {
	if (options.length !== undefined) {
		options.min = options.max = options.length;
	}
	this.type = "String";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
	this.min = options.min;
	this.max = options.max;
	this.pattern = options.pattern;
	this.oneOf = options.oneOf;
}

module.exports = StringProperty;
