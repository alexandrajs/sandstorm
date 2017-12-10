/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const fast = require("fast.js");
const Model = require("./model");
const Schema = require("./schema");
const Cursor = require("./cursor");
const types = require("./types");
const common = require("./common");
const mongodb = require("mongodb");
const AMule = require("amule");
const Aim = require("amule-aim");
const Rush = require("amule-rush");
const More = require("amule-more");
const parallel = require("run-parallel");

/**
 *
 * @param options
 * @constructor
 */
function Sandstorm(options) {
	this.options = {cache: {prefix: ""}};
	fast.assign(this.options, options || {});
	this.schemas = {};
	this.Schema = new Schema(this);
	this.db = null;
	this.cache = null;
}

/**
 *
 * @param {String} connectionString
 * @returns {Promise}
 */
Sandstorm.prototype.connect = function (connectionString) {
	return mongodb.MongoClient.connect(connectionString).then((db) => {
		this.db = db;
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
		return db;
	});
};
/**
 *
 */
Sandstorm.prototype.disconnect = function () {
	this.cache = null;
	return this.db && this.db.close();
};
/**
 *
 * @param {String} name
 * @param {Object} data
 * @returns {Model}
 */
Sandstorm.prototype.create = function (name, data) {
	return new Model(this, name, data);
};
/**
 *
 * @param {String} name
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
		return common.docToModel(this, name, doc);
	});
};
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
 * @param {String} name
 * @param {String|String[]} ids
 * @param {Object} options
 * @returns {Promise|Promise[]}
 * FIXME zmienic na callback
 */
Sandstorm.prototype.get = function (name, ids, options) {
	options = fast.assign({swallowErrors: false}, options || {});
	if (this.db === null) {
		return Promise.reject(new Error("Orm not connected", "ERR_ORM_NOT_CONNECTED"));
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
module.exports = Sandstorm;
