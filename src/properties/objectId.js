/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function ObjectIDProperty(options) {
	this.type = "ObjectID";
	this.required = options.required || false;
	this.unique = options.unique || false;
	this.default = options.default;
}

module.exports = ObjectIDProperty;
