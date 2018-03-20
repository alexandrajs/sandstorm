/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function MixedProperty(options) {
	this.type = "Mixed";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
}

module.exports = MixedProperty;
