/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const ExtError = require("exterror");
const Promise = require("bluebird");
const fast = require("fast.js");
const ObjectID = require("mongodb").ObjectID;

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
	this.engine = this.orm.engines[this.schema.options.engine];
	this.data = fast.assign({}, data || {});
	this.overwrite = false;
	this._set = {};
	this._hydrated = [];
}

module.exports = Model;
const types = require("./types");
const common = require("./common");
/**
 *
 * @param {Object} properties
 * @return {Promise<Model>}
 */
Model.prototype.set = function (properties) {
	return _set(this, properties);
};
/**
 *
 * @param {Object} properties
 * @return {Promise<Model>}
 */
Model.prototype.merge = function (properties) {
	return _set(this, properties, true);
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
		const merge = this.data._id && !this.overwrite;
		const key = merge ? "_set" : "data";
		_save_embedded(this, {key}).then(() => {
			this.dehydrate({key});
			if (merge) {
				return this.engine.save_merge(this, resolve, reject);
			}
			this.engine.save_set(this, resolve, reject);
			this.overwrite = false;
		}).catch(reject);
	});
};
/**
 *
 * @returns {Promise}
 */
Model.prototype.delete = function () {
	return this.engine.delete(this);
};
/**
 *
 * @param {Array} [names]
 * @returns {Promise}
 */
Model.prototype.hydrate = function (names) {
	return _hydrate(this, names);
};
/**
 * @returns {Model}
 */
Model.prototype.dehydrate = function (options) {
	_dehydrate(this, options);
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
 * @param {Object} [options]
 * @returns {Object}
 * @private
 */
function _get(model, options) {
	options = options || {
		dry: false,
		key: "data",
		properties: null
	}; // FIXME (assign)
	const _get_key = options.key in model ? options.key : "data";
	const source = model[_get_key];
	const properties = {};
	if (source._id && !model.schema.properties.hasOwnProperty("_id")) {
		properties._id = new ObjectID(source._id);
	}
	fast.array.forEach(options.properties || Object.keys(model.schema.properties), (propertyKey) => {
		const type = model.schema.properties[propertyKey].type;
		if (type in types) {
			const value = types[type].get(source, model.schema.properties[propertyKey], propertyKey);
			if (value !== null && value !== undefined) {
				properties[propertyKey] = value;
			}
			return;
		}
		if (type in model.orm.schemas) {
			properties[propertyKey] = source[propertyKey];
			return;
		}
		throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + propertyKey + "' to be one of base types or model, got " + type);
	});
	return properties;
}

/**
 *
 * @param {Model} model
 * @param {Object} properties
 * @param {boolean} [merge]
 * @returns {Promise<Model>}
 * @private
 */
function _set(model, properties, merge) {
	if (!merge) {
		model.overwrite = true;
		model.data = {_id: model.data._id};
	}
	return model.hydrate().then(() => {
		const await = [];
		fast.object.forEach(properties, (item, targetKey) => {
			if (targetKey === "_id" && !model.schema.properties.hasOwnProperty("_id")) {
				if (model.data._id) {
					throw new ExtError("ERR_CANT_OVERWRITE_ID", "Can't overwrite model '_id'");
				}
				if (!merge) {
					if (typeof item === "string") {
						item = new ObjectID(item);
					}
					if (!(item instanceof ObjectID)) {
						throw new ExtError("ERR_ID_MUST_BE_OBJECTID", "Value of '_id' must be instance of ObjectID or string, got " + typeof item);
					}
					model.data[targetKey] = model._set[targetKey] = item;
					return;
				}
			}
			if (!model.schema.properties[targetKey]) {
				throw new ExtError("ERR_PROPERTY_NOT_ALLOWED", "Property '" + targetKey + "' not allowed");
			}
			const type = model.schema.properties[targetKey].type;
			if (type in types) {
				return await.push(types[type].set(model, model.data, model._set, model.schema.properties[targetKey], targetKey, item));
			}
			if (type in model.orm.schemas) {
				if (common.isPlainObject(item)) {
					const data = fast.assign({}, item);
					const _id = data._id;
					delete data._id;
					if (_id) {
						return await.push(model.orm.get(type, _id).then(nested => {
							model.data[targetKey] = model._set[targetKey] = nested;
							return nested.merge(data);
						}));
					} else {
						item = new Model(model.orm, type);
						await.push(item.set(data));
					}
				}
				if (item instanceof Model) {
					if (item.name !== type) {
						throw new ExtError("ERR_WRONG_MODEL_TYPE", "Expected value of '" + targetKey + "' to be instance of '" + type + "', got '" + item.name + "'");
					}
					model.data[targetKey] = model._set[targetKey] = item;
					return;
				}
			}
			throw new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + targetKey + "' to be one of base types or model, got '" + typeof item + "'");
		});
		return Promise.all(await).then(() => model);
	});
}

/**
 *
 * @param {Model} model
 * @param [options]
 * @returns {Promise}
 * @private
 */
function _save_embedded(model, options) {
	options = options || {key: "data"};// FIXME (assign)
	const source = model[options.key];// FIXME check if exists
	const wait = [];
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (paths) => {
		fast.object.forEach(paths, (embed, path) => {
			common.pathMap(source, path, (embedded) => {
				if (embedded instanceof Array) {
					return fast.array.forEach(embedded, (embed) => {
						_save_embedded_model(model, embed, wait);
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
 * @param {Model} model
 * @param {Model} embedded
 * @param {Array} wait
 * @private
 */
function _save_embedded_model(model, embedded, wait) {
	if (embedded instanceof Model) {
		//common.pushUnique(model._hydrated, embedded.name);
		wait.push(embedded.save());
	}
}

/**
 *
 * @param {Model} model
 * @param {Array} [names]
 * @returns {Promise}
 * @private
 */
function _hydrate(model, names) {
	const wait = [];
	const dependencies = model.orm.schemas[model.name].dependencies;
	const hydrate = names || Object.keys(dependencies);
	fast.array.forEach(hydrate, (name) => {
		const dependency = dependencies[name];
		if (dependency && !~model._hydrated.indexOf(name)) {
			fast.object.forEach(dependency, (embedded, path) => {
				common.pathMap(model.data, path, (embedded, key, target) => {
					if (embedded instanceof Array) {
						return fast.array.forEach(embedded, (sub_embedded, sub_key, sub_target) => _hydrate_object(model, names, sub_target, sub_key, name, sub_embedded, wait));
					}
					_hydrate_object(model, names, target, key, name, embedded, wait);
				});
			});
		}
	});
	return Promise.all(wait).then(() => {
		fast.array.forEach(hydrate, (name) => common.pushUnique(model._hydrated, name));
		return model;
	});
}

/**
 *
 * @param {Model} model
 * @param {Array} names
 * @param {Object} target
 * @param {string} key
 * @param {string} name
 * @param {Object} embedded
 * @param {Array} wait
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
 * @param [options]
 * @private
 */
function _dehydrate(model, options) {
	options = options || {key: "data"}; // FIXME (assign)
	fast.object.forEach(model.orm.schemas[model.name].dependencies, (dependencies) => {
		fast.object.forEach(dependencies, (dependency, path) => {
			common.pathMap(model[options.key]/* FIXME check if exists */, path, (embedded, key, target) => {
				if (embedded instanceof Array) {
					return fast.array.forEach(embedded, (embed, key, target) => _dehydrate_model(embed, key, target, dependency));
				} else if (common.isPlainObject(embedded)) {
					return fast.object.forEach(embedded, (embed, key, target) => _dehydrate_model(embed, key, target, dependency));
				}
				_dehydrate_model(embedded, key, target, dependency);
			});
		});
	});
	model._hydrated = [];
}

/**
 *
 * @param {Model} embedded
 * @param {string} key
 * @param {Object} target
 * @param {Array} embed
 * @private
 */
function _dehydrate_model(embedded, key, target, embed) {
	if (embedded instanceof Model) {
		embedded.dehydrate();
		const data = embedded.get();
		target[key] = _extractProperties(data, embed);
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
	for (let i = 0; i < length; i += 1) {
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
	_set
};
