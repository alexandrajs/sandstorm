/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const fast = require("fast.js");
const ExtError = require("exterror");
const Promise = require("bluebird");

/**
 *
 * @param {Object} object
 * @returns {boolean}
 */
function isEmpty(object) {
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

/**
 *
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
	return value !== null && typeof value === "object" && value.constructor === Object;
}

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {string} id
 * @param {function} callback
 */
function ormGet(orm, name, id, callback) {
	orm.cache.get(name, id, callback);
}

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {string} id
 * @param {function} callback
 */
function getModel(orm, name, id, callback) {
	ormGet(orm, name, id, (err, doc) => {
		if (err) {
			return callback(err);
		}
		if (!doc) {
			return callback(null, null);
		}
		callback(null, orm.create(name, doc));
	});
}

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {Object} doc
 * @returns {Model}
 */
function docToModel(orm, name, doc) {
	return new Model(orm, name, doc);
}

/**
 *
 * @param {Object} object
 * @param {string} path
 * @param {function} callback
 * @returns {*}
 */
function pathMap(object, path, callback) {
	if (typeof object !== "object" || object === null) {
		throw new ExtError("ERR_PARAMETER_OBJECT_MUST_BE_OBJECT", "Parameter 'object' must be object, got " + typeof object);
	}
	if (typeof path !== "string") {
		throw new ExtError("ERR_PARAMETER_PATH_MUST_BE_STRING", "Parameter 'path' must be string, got " + typeof path);
	}
	if (typeof callback !== "function") {
		throw new ExtError("ERR_PARAMETER_CALLBACK_MUST_BE_FUNCTION", "Parameter 'callback' must be function, got " + typeof callback);
	}
	const parts = path.split(".");
	let current;
	while (current = parts.shift()) {
		if (!object) {
			return;
		}
		const item = object[current];
		if (item !== undefined) {
			if (!parts.length) {
				return callback(item, current, object);
			}
			if (item instanceof Array) {
				return fast.array.forEach(item, (item) => pathMap(item, parts.join("."), callback));
			}
		}
		object = item;
	}
}

/**
 *
 * @param {Array} array
 * @param item
 */
function pushUnique(array, item) {
	if (!~fast.array.indexOf(array, item)) {
		array.push(item);
	}
}

/**
 *
 * @param {Object} object
 * @param {Object} [options]
 * @returns {Object}
 */
function objectToDotNotation(object, options) {
	options = fast.assign({arrays: false}, options || {});
	const result = {};
	_objectToDotNotation(object, result, [], options);
	return result;
}

/**
 *
 * @param {Object} object
 * @param {Object} result
 * @param {Array} path
 * @param {Object} options
 * @private
 */
function _objectToDotNotation(object, result, path, options) {
	fast.object.forEach(object, (value, key) => {
		path.push(key);
		if (isPlainObject(value)) {
			_objectToDotNotation(value, result, path, options);
		} else {
			result[path.join(".")] = value;
		}
		path.pop();
	});
}

/**
 *
 * @param target
 * @param schema
 * @param key
 * @returns {*}
 */
function modelGet(target, schema, key) {
	if (target[key] === undefined) {
		if (schema.required) {
			if (schema.default !== undefined) {
				return typeof schema.default === "function" ? schema.default() : schema.default;
			}
			throw new ExtError("ERR_MISSING_PROPERTY", "Missing property '" + key + "'");
		}
		return;
	}
	return target[key];
}

/**
 * @param {Object} parameters
 * @param {Object} parameters.types
 * @param {Model} parameters.model
 * @param {Object} parameters.set
 * @param {Object|Array} parameters.target
 * @param {string} parameters.target_key
 * @param {*} parameters.item
 * @param {Object} parameters.item_schema
 * @param {string} parameters.type
 * @param {string} parameters.key
 * @param {*} parameters.value
 */
function setTargetItem(parameters) {
	let {types, model, set, target, target_key, item, item_schema, type, key, value} = parameters;
	if (type in types) {
		return types[type].set(model, target[key], set[key], item_schema, target_key, item);
	}
	if (type in model.orm.schemas) {
		let await = Promise.resolve();
		if (isPlainObject(item)) {
			const {_id, ...data} = item;
			if (_id) {
				return model.orm.get(type, _id).then(nested => {
					target[key][target_key] = set[key][target_key] = nested;
					return nested.merge(data);
				});
			} else {
				item = new Model(model.orm, type);
				await = item.set(data);
			}
		}
		if (item instanceof Model) {
			if (item.name === type) {
				target[key][target_key] = set[key][target_key] = item;
				return await;
			}
		}
	}
	return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + target_key + "' in '" + key + "' to be " + item_schema.type + ", got " + typeof value));
}

module.exports = {
	isEmpty,
	isPlainObject,
	ormGet,
	getModel,
	docToModel,
	pathMap,
	pushUnique,
	objectToDotNotation,
	_objectToDotNotation,
	modelGet,
	setTargetItem
};
const Model = require("./model");
