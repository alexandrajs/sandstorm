/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @constructor
 */
function ModelProperty(options, schema) {
	this.type = options.type;
	this.required = options.required || false;
	this.search = options.search;
}

module.exports = ModelProperty;
