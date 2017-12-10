"use strict";

/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
/**
 *
 * @param orm
 * @param name
 * @param data
 * @constructor
 */
function Model(orm, name, data) {
	this.orm = orm;
	this.name = name;
	this.schema = this.orm.schemas[name];
	this.data = fast.assign({}, data || {});
	this._set = {};
	this._unset = {};
	this._hydrated = [];
}

module.exports = Model;
const fast = require("fast.js");
const types = require("./types");
const common = require("./common");
const mongodb = require("mongodb");
/**
 *
 * @param properties
 */
Model.prototype.set = function (properties) {
	_set(this, properties);
};
/**
 *
 * @param options
 * @returns {{}}
 */
Model.prototype.get = function (options) {
	options = options || {dry: false};
	return _get(this, options);
};
/**
 *
 */
Model.prototype.save = function () {
	return new Promise((resolve, reject) => {
		_save_embedded(this).then(() => {
			this.dehydrate();
			if (this.data._id) {
				return _update(this, resolve, reject);
			}
			_insert(this, resolve, reject);
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
 *
 */
Model.prototype.dehydrate = function () {
	_dehydrate(this);
};
/**
 *
 * @returns {*}
 */
Model.prototype.toJSON = function () {
	return this.data;
};

/**
 *
 * @param model
 * @param resolve
 * @param reject
 * @private
 */
function _insert(model, resolve, reject) {
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			reject(err);
		}
		const doc = model.get();
		collection.insertOne(doc, (err, result) => {
			if (err) {
				return reject(err);
			}
			model._set = {};
			model._unset = {};
			model.data._id = doc._id;
			resolve(doc._id);
		});
	});
}

/**
 *
 * @param model
 * @param resolve
 * @param reject
 * @returns {*}
 * @private
 */
function _update(model, resolve, reject) {
	let changed = false;
	const update = {};
	if (model._set && Object.keys(model._set).length) {
		update.$set = common.objectToDotNotation(model._set);
		changed = true;
	}
	if (model._unset && Object.keys(model._unset).length) {
		update.$unset = common.objectToDotNotation(model._unset);
		changed = true;
	}
	const _id = model.data._id;
	if (!changed) {
		return resolve(_id);
	}
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			reject(err);
		}
		model._set = {};
		model._unset = {};
		collection.updateOne({_id: _id}, update, (err, result) => {
			if (err) {
				return reject(err);
			}
			model.orm.cache.delete(model.name, model.data._id, (err) => {
				if (err) {
					reject(err);
				}
				resolve(_id);
			});
		});
	});
}

/**
 *
 * @param model
 * @param options
 * @returns {{}}
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
			properties[propertyKey] = types[type].get(model.data, model.schema.properties[propertyKey], propertyKey);
			return;
		}
		if (type in model.orm.schemas) {
			if (!options.dry && property instanceof Model) {
				properties[propertyKey] = property.get();
			}
			return;
		}
		throw new TypeError("Wrong property '" + propertyKey + "' type", "wrong_property_type");
	});
	return properties;
}

/**
 *
 * @param model
 * @param properties
 * @private
 */
function _set(model, properties) {
	fast.object.forEach(properties, (item, targetKey) => {
		if (targetKey === "_id") {
			if (typeof item === "string") {
				item = new mongodb.ObjectID(item);
			}
			if (!(item instanceof mongodb.ObjectID)) {
				throw TypeError("_id must be instance of ObjectID", "ERR_ID_MUST_BE_OBJECTID");
			}
			model.data[targetKey] = item;
			model._set[targetKey] = item;
			return;
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
		throw new TypeError("Wrong property '" + targetKey + "' type '" + type + "'", "wrong_property_type");
	});
}

/**
 *
 * @param model
 * @returns {Promise}
 * @private
 */
function _save_embedded(model) {
	const wait = [];
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (paths) => {
		fast.array.forEach(paths, (path) => {
			common.pathMap(model.data, path, (embedded) => {
				if (embedded instanceof Model) {
					common.pushUnique(model._hydrated, embedded.name);
					wait.push(embedded.save());
				}
			});
		});
	});
	return Promise.all(wait);
}

/**
 *
 * @param model
 * @param names
 * @returns {Promise}
 * @private
 */
function _hydrate(model, names) {
	const wait = [];
	const dependencies = model.orm.schemas[model.name].dependencies;
	fast.array.forEach(names, (name) => {
		common.pushUnique(model._hydrated, name);
		const dependency = dependencies[name];
		fast.object.forEach(dependency, (paths) => {
			fast.array.forEach(paths, (path) => {
				common.pathMap(model.data, path, (embedded) => {
					if (!(embedded instanceof Model)) {
						if (!common.isPlainObject(embedded)) {
							return;
						}
					}
					common.pushUnique(model._hydrated, embedded.name);
				});
			});
		});
	});
	return Promise.all(wait);
}

/**
 *
 * @param model
 * @private
 */
function _dehydrate(model) {
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (paths) => {
		fast.object.forEach(paths, (search, path) => {
			common.pathMap(model.data, path, (embedded, key, target) => {
				if (embedded instanceof Model) {
					const data = embedded.get();
					target[key] = _extractProperties(data, search);
					target[key]._id = data._id;
				}
			});
		});
	});
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
