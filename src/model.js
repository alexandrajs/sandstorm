/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const ExtError = require("exterror");
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
	this.data = Object.assign({}, data || {});
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
	if (!properties || typeof properties !== "object") {
		return Promise.reject(new ExtError("ERR_MISSING_PROPERTIES_TO_SET", "Missing properties to set"));
	}
	return _set(this, properties);
};
/**
 *
 * @param {Object} properties
 * @return {Promise<Model>}
 */
Model.prototype.merge = function (properties) {
	if (!properties || typeof properties !== "object") {
		return Promise.reject(new ExtError("ERR_MISSING_PROPERTIES_TO_MERGE", "Missing properties to merge"));
	}
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
				return _save_merge(this, resolve, reject);
			}
			_save_set(this, resolve, reject);
			this.overwrite = false;
		}).catch(reject);
	});
};
/**
 *
 * @returns {Promise}
 */
Model.prototype.delete = function () {
	return _delete(this);
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
 * @param {function} resolve
 * @param {function} reject
 * @private
 */
function _save_set(model, resolve, reject) {
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		const doc = _get(model, {dry: true});
		const _save_set_cb = (err) => {
			if (err) {
				return reject(err);
			}
			model._set = {};
			model.data._id = doc._id;
			model.orm.cache.delete(model.name, doc._id, (err) => {
				if (err) {
					return reject(err);
				}
				resolve(doc._id);
			});
		};
		if (model.data._id) {
			if (typeof model.data._id === "string" && !model.schema.properties.hasOwnProperty("_id")) {
				model.data._id = new ObjectID(model.data._id);
			}
			return collection.replaceOne({_id: model.data._id}, doc, {upsert: true}, _save_set_cb);
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
		return reject(new ExtError("ERR_MISSING_ID_ON_MERGE_SAVE", "Missing '_id' on merge save"));
	}
	const _id = (typeof model.data._id === "string" && !model.schema.properties.hasOwnProperty("_id")) ? new ObjectID(model.data._id) : model.data._id;
	if (common.isEmpty(model._set)) {
		return resolve(_id);
	}
	const update = {
		$set: common.objectToDotNotation(_get(model, {
			dry: true,
			key: "_set",
			properties: Object.keys(model._set)
		}))
	};
	model.orm.db.collection(model.name, (err, collection) => {
		if (err) {
			return reject(err);
		}
		model._set = {};
		collection.updateOne({_id: _id}, update, {upsert: true}, (err) => {
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
 * @returns {Promise}
 * @private
 */
function _delete(model) {
	return new Promise((resolve, reject) => {
		if (!model.data._id) {
			return resolve();
		}
		model.orm.cache.delete(model.name, model.data._id, (err) => {
			if (err) {
				return reject(err);
			}
			model.orm.db.collection(model.name, (err, collection) => {
				if (err) {
					return reject(err);
				}
				collection.deleteOne({_id: model.data._id}, (err) => {
					model.orm.cache.delete(model.name, model.data._id, () => {
					});
					if (err) {
						return reject(err);
					}
					model.orm = model.name = model.schema = model.data = model.overwrite = model._set = model._hydrated = null;
					resolve();
				});
			});
		});
	});
}

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
	(options.properties || Object.keys(model.schema.properties)).forEach((propertyKey) => {
		const type = model.schema.properties[propertyKey].type;
		if (type in types) {
			const value = types[type].get(source, model.schema.properties[propertyKey], propertyKey, propertyKey, options.dry);
			if (value !== null && value !== undefined) {
				properties[propertyKey] = value;
			}
			return;
		}
		if (type in model.orm.schemas) {
			if (options.dry && source[propertyKey] instanceof Model) {
				properties[propertyKey] = source[propertyKey].get({dry: true});
				return;
			}
			if (source[propertyKey] !== null && source[propertyKey] !== undefined) {
				properties[propertyKey] = source[propertyKey];
			}
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
		const _await = [];
		Object.entries(properties).forEach(([targetKey, item]) => {
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
				throw new ExtError("ERR_PROPERTY_NOT_ALLOWED", "Property '" + targetKey + "' not allowed in model '" + this.name + "'");
			}
			const type = model.schema.properties[targetKey].type;
			if (type in types) {
				return _await.push(types[type].set(model, model.data, model._set, model.schema.properties[targetKey], targetKey, targetKey, item));
			}
			if (type in model.orm.schemas) {
				if (common.isPlainObject(item)) {
					const data = Object.assign({}, item);
					const _id = data._id;
					delete data._id;
					if (_id) {
						return _await.push(model.orm.get(type, _id).then(nested => {
							model.data[targetKey] = model._set[targetKey] = nested;
							return nested.merge(data);
						}));
					} else {
						item = new Model(model.orm, type);
						_await.push(item.set(data));
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
		return Promise.all(_await).then(() => model);
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
	Object.entries(model.orm.schemas[model.name].dependencies).forEach(([_, paths]) => {
		Object.entries(paths).forEach(([path, embed]) => {
			common.pathMap(source, path, (embedded) => {
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
	hydrate.forEach((name) => {
		const dependency = dependencies[name];
		if (dependency && !~model._hydrated.indexOf(name)) {
			Object.entries(dependency).forEach(([path, embedded]) => {
				common.pathMap(model.data, path, (embedded, key, target) => {
					if (embedded instanceof Array) {
						return embedded.forEach((sub_embedded, sub_key, sub_target) => _hydrate_object(model, names, sub_target, sub_key, name, sub_embedded, wait));
					}
					_hydrate_object(model, names, target, key, name, embedded, wait);
				});
			});
		}
	});
	return Promise.all(wait).then(() => {
		hydrate.forEach((name) => common.pushUnique(model._hydrated, name));
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
	if (!common.isPlainObject(embedded) || !embedded._id) {
		return;
	}
	wait.push(model.orm.get(name, embedded._id).then(_ => {
		if (!_) {
			return;
		}
		target[key] = _;
		return _.hydrate(names);
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
	Object.values(model.orm.schemas[model.name].dependencies).forEach((dependencies) => {
		Object.entries(dependencies).forEach(([path, dependency]) => {
			common.pathMap(model[options.key]/* FIXME check if exists */, path, (embedded, key, target) => {
				_dehydrate_model(embedded, key, target, dependency);
			});
		});
	});
	model._hydrated = [];
}

/**
 *
 * @param {Model} model
 * @param {string} key
 * @param {Object} target
 * @param {Array} embed
 * @private
 */
function _dehydrate_model(model, key, target, embed) {
	if (model instanceof Model) {
		model.dehydrate();
		const data = model.get({dry: true});
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
	_save_merge,
	_save_set,
	_set
};
