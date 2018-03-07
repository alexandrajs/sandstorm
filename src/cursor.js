/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const common = require("./common");
const fast = require("fast.js");
const Promise = require("bluebird");
const ExtError = require("exterror");

/**
 *
 * @param {MongoDB.Cursor} cursor
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {Object} [options]
 * @constructor
 */
function Cursor(cursor, orm, name, options) {
	this.cursor = cursor;
	this.orm = orm;
	this.name = name;
	this.options = {
		hydrate: [],
		raw: false
	};
	this.setOptions(options);
}

/**
 *
 * @param {Object} options
 */
Cursor.prototype.setOptions = function (options) {
	fast.assign(this.options, options || {});
};
/**
 *
 * @param {Object} [options]
 * @returns {Promise}
 */
Cursor.prototype.toArray = function (options) {
	this.setOptions(options);
	return this.cursor.toArray().then((docs) => {
		if (this.options.raw && !this.options.hydrate.length) {
			return docs;
		}
		const models = docs.map((doc) => {
			return common.docToModel(this.orm, this.name, doc);
		});
		if (this.options.hydrate.length) {
			return Promise.all(models.map((model) => {
				return model.hydrate(this.options.hydrate);
			}));
		}
		return models;
	});
};
/* istanbul ignore next */
/**
 *
 * @param options
 */
Cursor.prototype.stream = function (options) {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.map = function () {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.filter = function () {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.forEach = function () {
	// TODO: implement
};
/**
 *
 * @param {Object} collation
 * @returns {Cursor}
 */
Cursor.prototype.collation = function (collation) {
	this.cursor.collation(collation);
	return this;
};
/**
 *
 * @param {number} value
 * @returns {Cursor}
 */
Cursor.prototype.limit = function (value) {
	this.cursor.limit(value);
	return this;
};
/**
 *
 * @param {string|Array|Object} keyOrList
 * @param {number} direction
 * @returns {Cursor}
 */
Cursor.prototype.sort = function (keyOrList, direction) {
	this.cursor.sort(keyOrList, direction);
	return this;
};
/**
 *
 * @param {number} value
 * @returns {Cursor}
 */
Cursor.prototype.skip = function (value) {
	this.cursor.skip(value);
	return this;
};
/**
 *
 * @param {boolean} applySkipLimit
 * @param {object} options
 */
Cursor.prototype.count = function (applySkipLimit, options) {
	return this.cursor.count(applySkipLimit, options);
};
/**
 *
 * @param names
 * @returns {Cursor}
 */
Cursor.prototype.hydrate = function (names) {
	if (!(names instanceof Array)) {
		throw new ExtError("");
	}
	this.options.hydrate = names;
	return this;
};
module.exports = Cursor;