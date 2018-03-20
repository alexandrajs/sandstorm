/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function NumberProperty(options) {
	this.type = "Number";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
	this.integer = options.integer || false;
	this.autoincrement = options.autoincrement || false;
	this.min = options.min;
	this.max = options.max;
}

module.exports = NumberProperty;
