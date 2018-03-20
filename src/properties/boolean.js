/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function BooleanProperty(options) {
	this.type = "Boolean";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
}

module.exports = BooleanProperty;
