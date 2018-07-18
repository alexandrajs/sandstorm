/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const fast = require("fast.js");
const Model = require("./model");
const Schema = require("./schema");
const common = require("./common");
const Promise = require("bluebird");
const ExtError = require("exterror");
const Engines = require("./engines");

/**
 *
 * @param {Object} engines

 * @constructor
 */
function Sandstorm(engines) {
	/**
	 * @type {Object}
	 */
	this.schemas = {};
	/**
	 * @type {Schema}
	 */
	this.Schema = new Schema(this);
	// Sandstorm with engines
	fast.object.forEach(engines || {}, engine => engine.orm = this);
	/**
	 * @type {Object}
	 */
	this.engines = engines;
}

/**
 *
 * @type {{MongoDB: MongoDB, MySQL: MySQL}}
 */
Sandstorm.Engines = Engines;
/**
 * Create new model
 * @param {string} name
 * @param {Object} [data]
 * @returns {Model}
 */
Sandstorm.prototype.create = function (name, data) {
	if (typeof name !== "string") {
		throw new ExtError("ERR_MODEL_NAME_MUST_BE_STRING", "Expected parameter 'name' to be string, got " + typeof name);
	}
	if (!(name in this.schemas)) {
		throw new ExtError("ERR_MODEL_NOT_EXISTS", "Model '" + name + "' do not exists");
	}
	return new Model(this, name, data);
};
/**
 * Find documents
 * @param {string} name
 * @param {Object} query
 * @param {Object} [options]
 * @returns {Cursor}
 */
Sandstorm.prototype.find = function (name, query, options) {
	return this.engines[this.schemas[name].options.engine].find(this, name, query, options);
};
/**
 * Find one document
 * @param name
 * @param query
 * @param [options]
 * @returns {Promise}
 */
Sandstorm.prototype.findOne = function (name, query, options) {
	return this.engines[this.schemas[name].options.engine].findOne(this, name, query, options);
};
/* istanbul ignore next */
/**
 * Aggregate
 * @param name
 * @param pipeline
 * @param options
 * @returns {AggregationCursor}
 */
Sandstorm.prototype.aggregate = function (name, pipeline, options) {
	return this.engines[this.schemas[name].options.engine].aggregate(this, name, pipeline, options);
};
/**
 * Get one or more models
 * @param {string} name
 * @param {String|String[]} ids
 * @param {Object} [options]
 * @returns {Promise}
 */
Sandstorm.prototype.get = function (name, ids, options) {
	options = fast.assign({swallowErrors: false}, options || {});
	if (this.db === null) {
		return Promise.reject(new ExtError("ERR_ORM_NOT_CONNECTED", "Not connected"));
	}
	if (!(ids instanceof Array)) {
		return new Promise((resolve, reject) => {
			common.getModel(this, name, ids, (err, value) => {
				if (err) {
					return reject(err);
				}
				resolve(value);
			});
		});
	}
	const wait = [];
	for (let i = 0; i < ids.length; i++) {
		const promise = new Promise((resolve, reject) => {
			common.getModel(this, name, ids[i], (err, value) => {
				if (err) {
					return reject(err);
				}
				resolve(value);
			});
		});
		if (options.swallowErrors) {
			promise.catch(() => null);
		}
		wait.push(promise);
	}
	return Promise.all(wait);
};
/**
 * @see Schema.register
 * @param {string} name
 * @param {Object} blueprint
 * @returns {Object}
 */
Sandstorm.prototype.register = function (name, blueprint) {
	return this.Schema.register(name, blueprint);
};
module.exports = Sandstorm;
module.exports.Schema = Schema;
