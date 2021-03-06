/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const ExtError = require("exterror");
const {ObjectID} = require("mongodb");

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
	orm.cache.get(name, (orm.schemas[name].properties.hasOwnProperty("_id") && orm.schemas[name].properties._id.type !== "ObjectID" ? id : new ObjectID(id)), callback);
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
 * @returns {Promise<Model>}
 */
function docToModel(orm, name, doc) {
	const model = new Model(orm, name, doc);
	const {_id, ...data} = model.get();
	return model.set(data).then(_ => model);
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

	function _pathMap(object, path, current_key, origin) {
		if (Array.isArray(object)) {
			return object.map((item, key) => _pathMap(item, path, key, object));
		}
		if (!path) {
			return callback(object, current_key, origin || object);
		}
		const parts = path.split(".");
		let current;
		while (current = parts.shift()) {
			if (!object) {
				return;
			}
			const item = object[current];
			if (item !== undefined) {
				if (Array.isArray(item)) {
					return pathMap(item, parts.join("."), callback);
				}
				if (!parts.length) {
					return callback(item, current_key || current, object);
				}
			}
			object = item;
		}
	}

	_pathMap(object, path, "", callback);
}

/**
 *
 * @param {Array} array
 * @param item
 */
function pushUnique(array, item) {
	if (!~array.indexOf(item)) {
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
	options = Object.assign({arrays: false}, options || {});
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
	Object.entries(object).forEach(([key, value]) => {
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
 * @param path
 * @param {boolean} dry
 * @returns {*}
 */
function modelGet(target, schema, key, path, dry) {
	if (target[key] === undefined) {
		if (schema.required) {
			if (schema.default !== undefined) {
				return typeof schema.default === "function" ? schema.default() : schema.default;
			}
			throw new ExtError("ERR_MISSING_PROPERTY", "Missing required property '" + path + "'");
		}
		return;
	}
	if (dry) {
		if (schema.type === "Array") {
			return target[key].map((item, akey, array) => {
				return modelGet(array, schema.item, akey, path + "." + akey, dry);
			});
		}
		if (schema.type === "Object") {
			// TODO investigate why sometimes `schema.properties` is {} and sometimes undefined
			if (!schema.properties || isEmpty(schema.properties)) {
				return target[key];
			}
			const res = {};
			Object.keys(schema.properties).map((okey) => {
				const value = modelGet(target[key], schema.properties[okey], okey, path + "." + okey, dry);
				if (value !== null && value !== undefined) {
					res[okey] = value;
				}
			});
			return res;
		}
		if (target[key] instanceof Model) {
			return target[key].get({dry: true});
		}
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
	let {types, model, set, target, target_key, item, item_schema, type, key, path, value} = parameters;
	if (type in types) {
		return types[type].set(model, target[key], set[key], item_schema, target_key, path, item);
	}
	if (type in model.orm.schemas) {
		let _await = Promise.resolve();
		if (typeof item === "string") {
			item = {_id: item};
		}
		if (isPlainObject(item)) {
			const data = Object.assign({}, item);
			const _id = data._id;
			delete data._id;
			if (_id) {
				return model.orm.get(type, _id).then(nested => {
					target[key][target_key] = set[key][target_key] = nested;
					return nested.merge(data);
				});
			} else {
				item = new Model(model.orm, type);
				_await = item.set(data);
			}
		}
		if (item instanceof Model) {
			if (item.name === type) {
				target[key][target_key] = set[key][target_key] = item;
				return _await;
			}
		}
	}
	return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", "Expected value of '" + target_key + "' in '" + path + "' to be " + item_schema.type + ", got " + typeof value));
}

/**
 *
 * @param fieldOrSpec
 * @returns {string}
 */
function fieldOrSpecToName(fieldOrSpec) {
	if (typeof fieldOrSpec === "string") {
		return fieldOrSpec;
	}
	return Object.entries(fieldOrSpec).reduce((name, [key, value]) => name.concat(key, value), []).join("_");
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
	setTargetItem,
	fieldOrSpecToName
};
const Model = require("./model");
