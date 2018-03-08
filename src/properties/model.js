/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param options
 * @param path
 * @constructor
 */
function ModelProperty(options, path) {
	this.type = options.type;
	this.required = options.required || false;
	this.embed = options.embed;
	this.path = path;
}

module.exports = ModelProperty;
