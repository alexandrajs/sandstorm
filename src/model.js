/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {Object} [data]
 * @constructor
 */
function Model(orm, name, data) {
	this.orm = orm;
	this.name = name;
	this.schema = this.orm.schemas[name];
	this.data = fast.assign({}, data || {});
	this.overwrite = false;
	this._set = {};
	this._hydrated = [];
}

module.exports = Model;
const fast = require("fast.js");
const types = require("./types");
const common = require("./common");
const Promise = require("bluebird");
const ObjectID = require("mongodb").ObjectID;
/**
 *
 * @param {Object} properties
 */
Model.prototype.set = function (properties) {
	_set(this, properties);
	return this;
};
/**
 *
 * @param {Object} properties
 */
Model.prototype.merge = function (properties) {
	_set(this, properties, true);
	return this;
};
/**
 *
 * @param {Object} [options]
 * @returns {Object}
 */
Model.prototype.get = function (options) {
	options = options || {dry: false};
	return _get(this, options);
};
/**
 * @returns {Promise}
 */
Model.prototype.save = function () {
	return new Promise((resolve, reject) => {
		_save_embedded(this).then(() => {
			this.dehydrate();
			if (this.data._id && !this.overwrite) {
				return _save_merge(this, resolve, reject);
			}
			_save_set(this, resolve, reject);
			this.overwrite = false;
		}).catch(reject);
	});
};
/**
 *
 * @param {Array} names
 * @returns {Promise}
 */
Model.prototype.hydrate = function (names) {
	return _hydrate(this, names);
};
/**
 * @returns {Model}
 */
Model.prototype.dehydrate = function () {
	_dehydrate(this);
	return this;
};
/**
 *
 * @returns {Object}
 */
Model.prototype.toJSON = function () {
	return this.data;
};

/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
function _save_set(model, resolve, reject) {
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		const doc = model.get();
		const _save_set_cb = (err) => {
			if (err) {
				return reject(err);
			}
			model._set = {};
			model.data._id = doc._id;
			resolve(doc._id);
		};
		if (model.data._id) {
			if (typeof model.data._id === "string") {
				model.data._id = new ObjectID(model.data._id);
			}
			return collection.replaceOne({_id: model.data._id}, doc, _save_set_cb);
		}
		collection.insertOne(doc, _save_set_cb);
	});
}

/**
 *
 * @param {Model} model
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
function _save_merge(model, resolve, reject) {
	if (!model.data._id) {
		return reject(new Error("ERR_MISSING_ID_ON_MERGE_SAVE"));
	}
	const _id = typeof model.data._id === "string" ? new ObjectID(model.data._id) : model.data._id;
	if (common.isEmpty(model._set)) {
		return resolve(_id);
	}
	const update = {$set: common.objectToDotNotation(model._set)};
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		model._set = {};
		collection.updateOne({_id: _id}, update, (err) => {
			if (err) {
				return reject(err);
			}
			model.orm.cache.delete(model.name, model.data._id, (err) => {
				if (err) {
					return reject(err);
				}
				resolve(_id);
			});
		});
	});
}

/**
 *
 * @param {Model} model
 * @param {Object} options
 * @returns {Object}
 * @private
 */
function _get(model, options) {
	const properties = {};
	if (model.data._id) {
		properties._id = model.data._id;
	}
	fast.object.forEach(model.schema.properties, (property, propertyKey) => {
		const type = model.schema.properties[propertyKey].type;
		if (type in types) {
			const value = types[type].get(model.data, model.schema.properties[propertyKey], propertyKey);
			if (value !== null && value !== undefined) {
				properties[propertyKey] = value;
			}
			return;
		}
		if (type in model.orm.schemas) {
			properties[propertyKey] = model.data[propertyKey];
			return;
		}
		throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
	});
	return properties;
}

/**
 *
 * @param {Model} model
 * @param {Object} properties
 * @param {boolean} [merge]
 * @private
 */
function _set(model, properties, merge) {
	model.overwrite = true;
	model.data = {_id: model.data._id};
	fast.object.forEach(properties, (item, targetKey) => {
		if (targetKey === "_id") {
			if (model.data._id) {
				throw Error("ERR_CANT_OVERWRITE_ID");
			}
			if (!merge) {
				if (typeof item === "string") {
					item = new ObjectID(item);
				}
				if (!(item instanceof ObjectID)) {
					throw TypeError("ERR_ID_MUST_BE_OBJECTID");
				}
				model.data[targetKey] = item;
				model._set[targetKey] = item;
				return;
			}
		}
		const type = model.schema.properties[targetKey].type;
		if (type in types) {
			return types[type].set(model, model.data, model._set, model.schema.properties[targetKey], targetKey, item);
		}
		if (type in model.orm.schemas) {
			if (common.isPlainObject(item)) {
				const data = item;
				item = new Model(model.orm, type);
				item.set(data);
			}
			if (item instanceof Model) {
				if (item.name === type) {
					model.data[targetKey] = item;
					model._set[targetKey] = item;
					return;
				}
			}
		}
		throw new TypeError("ERR_WRONG_PROPERTY_TYPE");
	});
}

/**
 *
 * @param {Model} model
 * @returns {Promise}
 * @private
 */
function _save_embedded(model) {
	const wait = [];
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (paths) => {
		fast.object.forEach(paths, (search, path) => {
			common.pathMap(model.data, path, (embedded) => {
				if (embedded instanceof Array) {
					return fast.array.forEach(embedded, (embedded) => {
						_save_embedded_model(model, embedded, wait);
					});
				}
				_save_embedded_model(model, embedded, wait);
			});
		});
	});
	return Promise.all(wait);
}

/**
 *
 * @param model
 * @param embedded
 * @param wait
 * @private
 */
function _save_embedded_model(model, embedded, wait) {
	if (embedded instanceof Model) {
		common.pushUnique(model._hydrated, embedded.name);
		wait.push(embedded.save());
	}
}

/**
 *
 * @param {Model} model
 * @param {Array} names
 * @returns {Promise}
 * @private
 */
function _hydrate(model, names) {
	const wait = [];
	const dependencies = model.orm.schemas[model.name].dependencies;
	fast.array.forEach(names, (name) => {
		const dependency = dependencies[name];
		if (dependency) {
			fast.object.forEach(dependency, (searches, path) => {
				common.pathMap(model.data, path, (embedded, key, target) => {
					if (embedded instanceof Array) {
						return fast.array.forEach(embedded, (embedded, key, target) => _hydrate_object(model, names, target, key, name, embedded, wait));
					}
					_hydrate_object(model, names, target, key, name, embedded, wait);
				});
			});
		}
	});
	return Promise.all(wait).then(() => model);
}

/**
 *
 * @param model
 * @param names
 * @param target
 * @param key
 * @param name
 * @param embedded
 * @param wait
 * @private
 */
function _hydrate_object(model, names, target, key, name, embedded, wait) {
	if (!common.isPlainObject(embedded)) {
		return;
	}
	wait.push(model.orm.get(name, embedded._id).then(_ => {
		_.hydrate(names);
		target[key] = _;
	}));
}

/**
 *
 * @param {Model} model
 * @private
 */
function _dehydrate(model) {
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (paths) => {
		fast.object.forEach(paths, (search, path) => {
			common.pathMap(model.data, path, (embedded, key, target) => {
				if (embedded instanceof Array) {
					return fast.array.forEach(embedded, (embedded, key, target) => _dehydrate_model(embedded, key, target, search));
				}
				_dehydrate_model(embedded, key, target, search);
			});
		});
	});
}

/**
 *
 * @param embedded
 * @param key
 * @param target
 * @param search
 * @private
 */
function _dehydrate_model(embedded, key, target, search) {
	if (embedded instanceof Model) {
		const data = embedded.get();
		target[key] = _extractProperties(data, search);
		target[key]._id = data._id;
	}
}

/**
 *
 * @param {Object} object
 * @param {Array} properties
 * @returns {Object}
 * @private
 */
function _extractProperties(object, properties) {
	const result = {};
	const length = properties.length;
	for (let i = 0; i < length; i++) {
		result[properties[i]] = object[properties[i]];
	}
	return result;
}

// noinspection JSUnusedGlobalSymbols
Model[Symbol.for("private")] = {
	_dehydrate,
	_dehydrate_model,
	_extractProperties,
	_get,
	_hydrate,
	_hydrate_object,
	_save_embedded,
	_save_embedded_model,
	_save_merge,
	_save_set,
	_set
};