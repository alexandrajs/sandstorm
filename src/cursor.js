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
 * @param {Cursor} cursor
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
	if (this.options.collation) {
		this.collation(this.options.collation);
	}
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
		const models = docs.map((doc) => common.docToModel(this.orm, this.name, doc));
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
/**
 *
 * @param {Function} callback
 * @param {Object} options
 * @returns {Promise<Array>}
 */
Cursor.prototype.map = async function (callback, options) {
	this.setOptions(options);
	const result = [];
	let model;
	do {
		model = await this.next();
		if (model) {
			result.push(await callback(model));
		}
	} while (model);
	return result;
};
/**
 *
 * @param {Function} callback
 * @param {Object} options
 * @returns {Promise<Array>}
 */
Cursor.prototype.filter = async function (callback, options) {
	this.setOptions(options);
	const result = [];
	let model;
	do {
		model = await this.next();
		if (model) {
			if (await callback(model)) {
				result.push(model);
			}
		}
	} while (model);
	return result;
};
/**
 *
 * @param {Function} callback
 * @param {Object} options
 * @returns {Promise<void>}
 */
Cursor.prototype.forEach = async function (callback, options) {
	this.setOptions(options);
	let model;
	do {
		model = await this.next();
		if (model) {
			await callback(model);
		}
	} while (model);
};
/**
 *
 * @returns {Promise<Object|Model>}
 */
Cursor.prototype.next = function () {
	return this.cursor.next().then((doc) => {
		if (!doc || this.options.raw && (!this.options.hydrate || !this.options.hydrate.length)) {
			return doc;
		}
		const model = common.docToModel(this.orm, this.name, doc);
		if (this.options.hydrate && this.options.hydrate.length) {
			return model.hydrate(this.options.hydrate);
		}
		return model;
	});
};
/**
 *
 * @param {Object} value
 * @returns {Cursor}
 */
Cursor.prototype.project = function (value) {
	this.cursor.project(value);
	return this;
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
