/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function DateProperty(options) {
	this.type = "Date";
	this.required = options.required || false;
	this.default = options.default;
	this.min = options.min;
	this.max = options.max;
}

module.exports = DateProperty;