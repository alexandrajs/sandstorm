/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const mongodb = require("mongodb");
const AMule = require("amule");
const Aim = require("amule-aim");
const Rush = require("amule-rush");
const More = require("amule-more");
const fast = require("fast.js");
const Model = require("../../model");
const common = require("../../common");
const Promise = require("bluebird");
const ExtError = require("exterror");
const Cursor = require("./cursor");

/**
 * @param {Object} [options]
 * @param {Object} options.cache
 * @param {Object} options.cache.l0
 * @param {Object} options.cache.l1
 * @param {Object} options.cache.l2
 * @constructor
 */
function MongoDB(options) {
	/**
	 * @type {MongoClient|null}
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
	this.options = {
		cache: {
			l0: {},
			l1: {},
			l2: {}
		}
	};
	fast.assign(this.options, options || {});
	/**
	 *
	 * @type {Sandstorm|null}
	 */
	this.orm = null;
}

MongoDB.Cursor = Cursor;
/**
 * Connect to MongoDD using given connection string
 * @param {string} connectionString
 * @returns {Promise<MongoClient>}
 */
MongoDB.prototype.connect = function (connectionString) {
	this._connectionString = "";
	return mongodb.MongoClient.connect(connectionString).then((client) => {
		this._connectionString = connectionString;
		this.client = client;
		return client;
	});
};
/**
 * Select database to use
 * @param {string} dbName
 * @returns {Promise<Db>}
 */
MongoDB.prototype.use = function (dbName) {
	this.db = this.client.db(dbName);
	this.cache = _init_cache(this, dbName);
	return _ensure_indexes(this.db, this.orm.schemas);
};
/**
 * Disconnects from server
 */
MongoDB.prototype.disconnect = function () {
	this.cache.pop();
	this.cache.pop().client.disconnect(); // Redis disconnect
	this.cache = null;
	return this.client && this.client.close(true);
};
/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
MongoDB.prototype.save_set = function (model, resolve, reject) {
	this.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		const doc = model.get();
		const _save_set_cb = (err) => {
			if (err) {
				return reject(err);
			}
			model._set = {};
			model.data[model.primaryKey] = doc[model.primaryKey];
			resolve(doc[model.primaryKey]);
		};
		if (model.data[model.primaryKey]) {
			if (typeof model.data[model.primaryKey] === "string" && !model.schema.properties.hasOwnProperty(model.primaryKey)) {
				model.data[model.primaryKey] = new ObjectID(model.data[model.primaryKey]);
			}
			return collection.replaceOne({[model.primaryKey]: model.data[model.primaryKey]}, doc, {upsert: true}, _save_set_cb);
		}
		collection.insertOne(doc, _save_set_cb);
	});
};
/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
MongoDB.prototype.save_merge = function (model, resolve, reject) {
	if (!model.data[model.primaryKey]) {
		return reject(new ExtError("ERR_MISSING_PRIMARY_KEY_ON_MERGE_SAVE", "Missing '" + model.primaryKey + "' on merge save"));
	}
	const _id = (typeof model.data[model.primaryKey] === "string" && !model.schema.properties.hasOwnProperty(model.primaryKey)) ? new ObjectID(model.data[model.primaryKey]) : model.data[model.primaryKey];
	if (common.isEmpty(model._set)) {
		return resolve(_id);
	}
	const update = {
		$set: common.objectToDotNotation(model.get({
			dry: false,
			key: "_set",
			properties: Object.keys(model._set)
		}))
	};
	this.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		model._set = {};
		collection.updateOne({[model.primaryKey]: _id}, update, {upsert: true}, (err) => {
			if (err) {
				return reject(err);
			}
			this.cache.delete(model.name, model.data[model.primaryKey], (err) => {
				if (err) {
					return reject(err);
				}
				resolve(_id);
			});
		});
	});
};
/**
 *
 * @param {Model} model
 * @returns {Promise}
 * @private
 */
MongoDB.prototype.delete = function (model) {
	return new Promise((resolve, reject) => {
		if (!model.data[model.primaryKey]) {
			return resolve();
		}
		this.cache.delete(model.name, model.data[model.primaryKey], (err) => {
			if (err) {
				return reject(err);
			}
			this.db.collection(model.name, (err, collection) => {
				if (err) {
					return reject(err);
				}
				collection.deleteOne({[model.primaryKey]: model.data[model.primaryKey]}, (err) => {
					if (err) {
						return reject(err);
					}
					model.orm = model.name = model.schema = model.data = model.overwrite = model._set = model._hydrated = null;
					resolve();
				});
			});
		});
	});
};
/**
 * Find documents
 * @param {Sandstorm} sandstorm
 * @param {string} name
 * @param {Object} query
 * @param {Object} [options]
 * @returns {Cursor}
 */
MongoDB.prototype.find = function (sandstorm, name, query, options) {
	return new Cursor(this.db.collection(name).find(query, fast.assign({}, sandstorm.schemas[name].options || {}, options || {})), sandstorm, name, sandstorm.schemas[name].options);
};
/**
 * Find one document
 * @param {Sandstorm} sandstorm
 * @param name
 * @param query
 * @param [options]
 * @returns {Promise}
 */
MongoDB.prototype.findOne = function (sandstorm, name, query, options) {
	options = options || {};
	return this.db.collection(name).findOne(query, options).then((doc) => {
		if (!doc) {
			return doc;
		}
		const model = new Model(sandstorm, name, doc);
		if (options.hydrate && options.hydrate.length) {
			return model.hydrate(options.hydrate);
		}
		return model;
	});
};
/* istanbul ignore next */
/**
 * Aggregate
 * @param {Sandstorm} sandstorm
 * @param name
 * @param pipeline
 * @param options
 * @returns {AggregationCursor}
 */
MongoDB.prototype.aggregate = function (sandstorm, name, pipeline, options) {
	return this.db.collection(name).aggregate(pipeline, options);
};
const __caches = {};

/**
 * @param {MongoDB} engine
 * @param {string} name
 * @returns {AMule}
 * @private
 */
function _init_cache(engine, name) {
	const cache_name = engine._connectionString + "_" + name;
	if (cache_name in __caches) {
		return __caches[cache_name];
	}
	const mule = new AMule();
	const aim = new Aim(fast.assign({cache: false}, engine.options.cache.l0 || {}));
	const rush = new Rush(fast.assign({prefix: name + "_"}, engine.options.cache.l1 || {}));
	const more = new More(engine.db, fast.assign({}, engine.options.cache.l2 || {}));
	mule.use(aim);
	mule.use(rush);
	mule.use(more);
	__caches[cache_name] = mule;
	return mule;
}

/**
 *
 * @param {Db} db
 * @param {Object} schemas
 * @returns {Promise<Db>}
 * @private
 */
function _ensure_indexes(db, schemas) {
	const wait = [];
	fast.object.forEach(schemas, (schema, name) => {
		const indexes = schema.options.indexes;
		indexes && wait.push(new Promise((resolve, reject) => {
			db.collection(name, (err, collection) => {
				if (err) {
					return reject(err);
				}
				resolve(Promise.all(fast.array.map(indexes, (index) => {
					if (!common.isPlainObject(index)) {
						return Promise.reject(new ExtError("ERR_COLLECTION_INDEX_MUST_BE_OBJECT", "Collection index must be plain object"));
					}
					if (typeof index.fieldOrSpec !== "string" && !common.isPlainObject(index.fieldOrSpec)) {
						return Promise.reject(new ExtError("ERR_COLLECTION_INDEX_FIELDORSPEC_MUST_BE_OBJECTOR_STRING", "Collection index.fieldOrSpec must be plain object or string"));
					}
					const options = fast.assign({}, index.options || {});
					const collation = fast.object.clone(schema.options.collation || {});
					if (!common.isEmpty(collation) && !options.collation) {
						options.collation = collation;
					}
					return collection.createIndex(index.fieldOrSpec, common.isEmpty(options) ? undefined : options);
				})));
			});
		}));
	});
	return Promise.all(wait).then(() => db);
}

module.exports = MongoDB;
