/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const fast = require("fast.js");
const Model = require("./model");
const Schema = require("./schema");
const Cursor = require("./cursor");
const common = require("./common");
const mongodb = require("mongodb");
const AMule = require("amule");
const Aim = require("amule-aim");
const Rush = require("amule-rush");
const More = require("amule-more");
const Promise = require("bluebird");

/**
 *
 * @param options
 * @constructor
 */
function Sandstorm(options) {
	this.options = {cache: {prefix: ""}};
	fast.assign(this.options, options || {});
	/**
	 * @type {Object}
	 */
	this.schemas = {};
	/**
	 * @type {Schema}
	 */
	this.Schema = new Schema(this);
	/**
	 * @type {mongodb.Db|null}
	 */
	this.db = null;
	/**
	 * @type {mongodb.MongoClient|null}
	 */
	this.client = null;
	/**
	 * @type {AMule}
	 */
	this.cache = null;
}

/**
 *
 * @param {string} connectionString
 * @returns {Promise}
 */
Sandstorm.prototype.connect = function (connectionString) {
	return mongodb.MongoClient.connect(connectionString).then((client) => {
		this.client = client;
		return client;
	});
};
/**
 *
 * @param {string} dbName
 * @returns {mongodb.Db}
 */
Sandstorm.prototype.use = function (dbName) {
	this.db = this.client.db(dbName);
	const mule = new AMule();
	const aim = new Aim({cache: false});
	const rush = new Rush({
		client: this.options.redisClient,
		prefix: this.options.cache.prefix
	});
	const more = new More({
		db: this.db,
		prefix: this.options.cache.prefix
	});
	mule.use(aim);
	mule.use(rush);
	mule.use(more);
	this.cache = mule;
	return this.db;
};
/**
 *
 */
Sandstorm.prototype.disconnect = function () {
	this.cache = null;
	return this.client && this.client.close();
};
/**
 *
 * @param {string} name
 * @param {Object} [data]
 * @returns {Model}
 */
Sandstorm.prototype.create = function (name, data) {
	if (typeof name !== "string") {
		throw new TypeError("ERR_MODEL_NAME_MUST_BE_STRING");
	}
	if (!(name in this.schemas)) {
		throw new Error("ERR_MODEL_NOT_EXISTS");
	}
	return new Model(this, name, data);
};
/**
 *
 * @param {string} name
 * @param {Object} [query]
 * @returns {Cursor}
 */
Sandstorm.prototype.find = function (name, query) {
	return new Cursor(this.db.collection(name).find(query), this, name);
};
/**
 *
 * @param name
 * @param query
 * @param options
 * @returns {Promise}
 */
Sandstorm.prototype.findOne = function (name, query, options) {
	return this.db.collection(name).findOne(query, options).then((doc) => {
		if (!doc) {
			return doc;
		}
		return common.docToModel(this, name, doc);
	});
};
/* istanbul ignore next */
/**
 *
 * @param name
 * @param pipeline
 * @param options
 * @returns {Cursor}
 */
Sandstorm.prototype.aggregate = function (name, pipeline, options) {
	return new Cursor(this.db.collection(name).aggregate(pipeline, options), this, name);
};
/**
 *
 * @param {string} name
 * @param {String|String[]} ids
 * @param {Object} [options]
 * @returns {Promise}
 */
Sandstorm.prototype.get = function (name, ids, options) {
	options = fast.assign({swallowErrors: false}, options || {});
	if (this.db === null) {
		return Promise.reject(new Error("ERR_ORM_NOT_CONNECTED"));
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
			promise.catch(() => {
				return null;
			});
		}
		wait.push(promise);
	}
	return Promise.all(wait);
};
/**
 *
 * @param {string} name
 * @param {Object} blueprint
 * @returns {Object}
 */
Sandstorm.prototype.register = function (name, blueprint) {
	return this.Schema.register(name, blueprint);
};
module.exports = Sandstorm;
