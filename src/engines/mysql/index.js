/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const mysql = require("mysql");
const Connection = require("mysql/lib/Connection");
const AMule = require("amule");
const Aim = require("amule-aim");
const Rush = require("amule-rush");
const Myro = require("amule-myro");
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
function MySQL(options) {
	/**
	 * @type {Connection|null}
	 */
	this.connection = null;
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

MySQL.Cursor = Cursor;
/**
 * Connect to MongoDD using given connection string
 * @param {string} connectionString
 * @returns {Promise<Connection>}
 */
MySQL.prototype.connect = function (connectionString) {
	this._connectionString = "";
	return new Promise((resolve, reject) => {
		const connection = mysql.createConnection(connectionString);
		this._connectionString = connectionString;
		this.connection = connection;
		resolve(connection);
	});
};
/**
 * Select database to use
 * @param {string} dbName
 * @returns {Promise<Db>}
 */
MySQL.prototype.use = function (dbName) {
	return new Promise((resolve, reject) => {
		this.connection.query("USE `" + dbName + "`", (err) => {
			if (err) {
				return reject(err);
			}
			this.cache = _init_cache(this, dbName);
			_ensure_indexes(this.db, this.orm.schemas).then(resolve).catch(reject);
		});
	});
};
/**
 * Disconnects from server
 */
MySQL.prototype.disconnect = function () {
	this.cache.pop();
	this.cache.pop().client.disconnect(); // Redis disconnect
	this.cache = null;
	return this.connection && this.connection.end();
};
/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
MySQL.prototype.save_set = function (model, resolve, reject) {
	const doc = model.get();
	const _save_set_cb = (error, results) => {
		if (error) {
			return reject(error);
		}
		model._set = {};
		if (results.insertId) {
			doc[model.primaryKey] = model.data[model.primaryKey] = results.insertId;
		}
		resolve(doc[model.primaryKey]);
	};
	if (model.data[model.primaryKey]) {
		delete doc[model.primaryKey];
		return this.connection.query("UPDATE " + this.connection.escapeId(model.name) + " SET " + Object.keys(doc).map((key) => {
			const value = doc[key];
			return this.connection.escapeId(key) + "=" + this.connection.escape(value && typeof value === "object" ? JSON.stringify(value) : value);
		}).join(", ") + " WHERE " + this.connection.escapeId(model.primaryKey) + "=" + this.connection.escape(model.data[model.primaryKey]), _save_set_cb);
	}
	this.connection.query("INSERT INTO " + this.connection.escapeId(model.name) + " SET " + Object.keys(doc).map((key) => {
		const value = doc[key];
		return this.connection.escapeId(key) + "=" + this.connection.escape(value && typeof value === "object" ? JSON.stringify(value) : value);
	}).join(", "), _save_set_cb);
};
/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
MySQL.prototype.save_merge = function (model, resolve, reject) {
	if (!model.data[model.primaryKey]) {
		return reject(new ExtError("ERR_MISSING_PRIMARY_KEY_ON_MERGE_SAVE", "Missing '" + model.primaryKey + "' on merge save"));
	}
	const _id = (typeof model.data[model.primaryKey] === "string" && !model.schema.properties.hasOwnProperty(model.primaryKey)) ? new ObjectID(model.data[model.primaryKey]) : model.data[model.primaryKey];
	if (common.isEmpty(model._set)) {
		return resolve(_id);
	}
	this.connection.query("UPDATE " + this.connection.escapeId(model.name) + " SET " + Object.keys(model._set).map((key) => {
		const value = model._set[key];
		return this.connection.escapeId(key) + "=" + this.connection.escape(value && typeof value === "object" ? JSON.stringify(value) : value);
	}).join(", ") + " WHERE " + this.connection.escapeId(model.primaryKey) + "=" + this.connection.escape(model.data[model.primaryKey]), (err) => {
		model._set = {};
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
};
/**
 *
 * @param {Model} model
 * @returns {Promise}
 * @private
 */
MySQL.prototype.delete = function (model) {
	return new Promise((resolve, reject) => {
		if (!model.data[model.primaryKey]) {
			return resolve();
		}
		this.cache.delete(model.name, model.data[model.primaryKey], (err) => {
			if (err) {
				return reject(err);
			}
			this.connection.query("DELETE FROM " + this.connection.escapeId(model.name) + " WHERE " + this.connection.escapeId(model.primaryKey) + "=" + this.connection.escape(model.data[model.primaryKey]), (err) => {
				if (err) {
					return reject(err);
				}
				model.orm = model.name = model.schema = model.data = model.overwrite = model._set = model._hydrated = null;
				resolve();
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
MySQL.prototype.find = function (sandstorm, name, query, options) {
	return new Cursor(query, sandstorm, name, fast.assign({}, sandstorm.schemas[name].options || {}, options || {}));
};
/**
 * Find one document
 * @param {Sandstorm} sandstorm
 * @param name
 * @param query
 * @param [options]
 * @returns {Promise}
 */
MySQL.prototype.findOne = function (sandstorm, name, query, options) {
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
MySQL.prototype.aggregate = function (sandstorm, name, pipeline, options) {
	return this.db.collection(name).aggregate(pipeline, options);
};
/**
 *
 * @param name
 * @returns {Promise}
 */
MySQL.prototype.truncateAll = function (name) {
	return new Promise((resolve, reject) => {
		this.connection.query("SELECT Concat('TRUNCATE TABLE ',table_schema,'.',TABLE_NAME, ';') as `query` FROM INFORMATION_SCHEMA.TABLES where table_schema in ('" + name + "');", (err, res) => {
			if (err) {
				reject(err);
			}
			Promise.all(res.map((sql) => {
				new Promise((resolve, reject) => {
					this.connection.query(sql.query, (err, res) => {
						if (err) {
							reject(err);
						}
						resolve();
					});
				});
			})).then(resolve).catch(reject);
		});
	});
};
const __caches = {};

/**
 * @param {MySQL} engine
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
	const myro = new Myro(engine.connection);
	mule.use(aim);
	mule.use(rush);
	mule.use(myro);
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

module.exports = MySQL;
