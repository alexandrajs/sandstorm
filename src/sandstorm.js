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
const ExtError = require("exterror");

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
	/**
	 *
	 * @type {string}
	 * @private
	 */
	this._connectionString = "";
}

/**
 *
 * @param {string} connectionString
 * @returns {Promise}
 */
Sandstorm.prototype.connect = function (connectionString) {
	this._connectionString = "";
	return mongodb.MongoClient.connect(connectionString).then((client) => {
		this._connectionString = connectionString;
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
	this.cache = _init_cache(this, dbName);
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
		throw new ExtError("ERR_MODEL_NAME_MUST_BE_STRING", "Expected parameter 'name' to be string, got " + typeof name);
	}
	if (!(name in this.schemas)) {
		throw new ExtError("ERR_MODEL_NOT_EXISTS", "Model '" + name + "' do not exists");
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
 *
 * @param {string} name
 * @param {Object} blueprint
 * @returns {Object}
 */
Sandstorm.prototype.register = function (name, blueprint) {
	return this.Schema.register(name, blueprint);
};
module.exports = Sandstorm;
module.exports.Schema = Schema;
const __caches = {};

function _init_cache(orm, name) {
	const cache_name = orm._connectionString + "_" + name;
	if (cache_name in __caches) {
		return __caches[cache_name];
	}
	const mule = new AMule();
	const aim = new Aim({cache: false});
	const rush = new Rush({
		client: orm.options.redisClient,
		prefix: name + "_"
	});
	const more = new More({
		db: orm.db
	});
	mule.use(aim);
	mule.use(rush);
	mule.use(more);
	__caches[cache_name] = mule;
	return mule;
}
