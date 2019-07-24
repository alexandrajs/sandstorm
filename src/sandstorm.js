/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Model = require("./model");
const Schema = require("./schema");
const Cursor = require("./cursor");
const common = require("./common");
const mongodb = require("mongodb");
const AMule = require("amule");
const Aim = require("amule-aim");
const Rush = require("amule-rush");
const More = require("amule-more");
const ExtError = require("exterror");

/**
 *
 * @param {Object} [options]
 * @param {Object} options.cache
 * @param {Object} options.cache.l0
 * @param {Object} options.cache.l1
 * @param {Object} options.cache.l2
 * @constructor
 */
function Sandstorm(options) {
	this.options = {
		cache: {
			l0: {},
			l1: {},
			l2: {enforceObjectID: false}
		}
	};
	Object.assign(this.options, options || {});
	/**
	 * @type {Object}
	 */
	this.schemas = {};
	/**
	 * @type {Schema}
	 */
	this.Schema = new Schema(this);
	/**
	 * @type {Db|null}
	 */
	this.db = null;
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
}

/**
 * Connect to MongoDD using given connection string
 * @param {string} connectionString
 * @returns {Promise<MongoClient>}
 */
Sandstorm.prototype.connect = function (connectionString) {
	this._connectionString = "";
	const cache_name = connectionString;
	if (cache_name in __c_caches) {
		this._connectionString = connectionString;
		this.client = __c_caches[cache_name];
		return Promise.resolve(this.client);
	}
	return mongodb.MongoClient.connect(connectionString).then((client) => {
		this._connectionString = connectionString;
		this.client = client;
		return __c_caches[cache_name] = client;
	});
};
/**
 * Select database to use
 * @param {string} dbName
 * @returns {Promise<Db>}
 */
Sandstorm.prototype.use = function (dbName) {
	this.db = this.client.db(dbName);
	this.cache = _init_cache(this, dbName);
	return this.ensureIndexes().catch(error => (console.error(error), this.db));
};
/**
 *
 * @returns {Promise<Db>}
 */
Sandstorm.prototype.ensureIndexes = function () {
	return _ensure_indexes(this.db, this.schemas);
};
/**
 * Disconnects from server
 */
Sandstorm.prototype.disconnect = function () {
	const cache_name = this._connectionString;
	delete __c_caches[cache_name];
	this.cache.pop();
	this.cache.pop().client.disconnect(); // Redis disconnect
	this.cache = null;
	return this.client && this.client.close(true);
};
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
	return new Cursor(this.db.collection(name).find(query, Object.assign({}, this.schemas[name].options || {}, options || {})), this, name, this.schemas[name].options);
};
/**
 * Find one document
 * @param name
 * @param query
 * @param [options]
 * @returns {Promise}
 */
Sandstorm.prototype.findOne = function (name, query, options) {
	options = options || {};
	return this.db.collection(name).findOne(query, options).then((doc) => {
		if (!doc) {
			return doc;
		}
		const model = common.docToModel(this, name, doc);
		if (options.hydrate && options.hydrate.length) {
			return model.hydrate(options.hydrate);
		}
		return model;
	});
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
	return this.db.collection(name).aggregate(pipeline, options);
};
/**
 * Get one or more models
 * @param {string} name
 * @param {String|String[]|ObjectID|ObjectID[]} ids
 * @param {Object} [options]
 * @returns {Promise}
 */
Sandstorm.prototype.get = function (name, ids, options) {
	options = Object.assign({swallowErrors: false}, options || {});
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
Sandstorm.prototype.autoincrement = function (name) {
	return this.db.collection("_autoincrement").findOneAndUpdate({_id: name}, {$inc: {value: 1}}, {
		upsert: true,
		returnOriginal: false
	}).then((result) => result.value.value);
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
const __caches = {};
const __c_caches = {};

/**
 * @param {Sandstorm} orm
 * @param {string} name
 * @returns {AMule}
 * @private
 */
function _init_cache(orm, name) {
	const cache_name = orm._connectionString + "_" + name;
	if (cache_name in __caches) {
		return __caches[cache_name];
	}
	const mule = new AMule();
	const aim = new Aim(Object.assign({cache: false}, orm.options.cache.l0 || {}));
	const rush = new Rush(Object.assign({prefix: name + "_"}, orm.options.cache.l1 || {}));
	const more = new More(orm.db, Object.assign({}, orm.options.cache.l2 || {}));
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
	Object.entries(schemas).forEach(([name, schema]) => {
		const indexes = schema.options.indexes;
		indexes && wait.push(new Promise((resolve, reject) => {
			db.collection(name, (err, collection) => {
				if (err) {
					return reject(err);
				}
				resolve(Promise.all(indexes.map((index) => {
					if (!common.isPlainObject(index)) {
						return Promise.reject(new ExtError("ERR_COLLECTION_INDEX_MUST_BE_OBJECT", "Collection index must be plain object"));
					}
					if (typeof index.fieldOrSpec !== "string" && !common.isPlainObject(index.fieldOrSpec)) {
						return Promise.reject(new ExtError("ERR_COLLECTION_INDEX_FIELD_OR_SPEC_MUST_BE_OBJECT_OR_STRING", "Collection index.fieldOrSpec must be plain object or string"));
					}
					const options = Object.assign({}, index.options || {});
					const collation = Object.assign({}, schema.options.collation || {});
					if (!common.isEmpty(collation) && !options.collation) {
						options.collation = collation;
					}
					return collection.createIndex(index.fieldOrSpec, common.isEmpty(options) ? undefined : options).catch(error => {
						// TODO check if it's doubled index name, if so, drop old index and try again
						throw new ExtError("ERR_MONGODB_INTERNAL_ERROR", error.message);
					});
				})));
			});
		}));
	});
	return Promise.all(wait).then(() => db);
}
