/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Model = require("./model");
const fast = require("fast.js");
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
		throw new TypeError("ERR_PARAMETER_OBJECT_MUST_BE_OBJECT");
	}
	if (typeof path !== "string") {
		throw new TypeError("ERR_PARAMETER_PATH_MUST_BE_STRING");
	}
	if (typeof callback !== "function") {
		throw new TypeError("ERR_PARAMETER_PATH_MUST_BE_STRING");
	}
	const parts = path.split(".");
	let current;
	while (current = parts.shift()) {
		if (!object) {
			return;
		}
		const item = object[current];
		if (item !== undefined) {
			/*if (current === "$") {
				if (object instanceof Array) {
					if (!parts.length) {
						return fast.array.forEach(object, (item, key) => callback(item, key, object));
					}
					fast.array.forEach(object, (item) => pathMap(item, parts.join("."), callback));
				}
			}*/
			if (!parts.length) {
				if (item instanceof Array) {
					return fast.array.forEach(item, callback);
				}
				return void callback(item, current, object);
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
		if (typeof value === "object" && value !== null) {
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
			throw new Error("ERR_MISSING_PROPERTY");
		}
		return;
	}
	switch (schema.type) {
		case "Array":
			return fast.cloneArray(target[key]);
		case "Date":
			return new Date(target[key].toJSON());
		case "Mixed":
			return typeof target[key] === "object" && target[key] !== null ? fast.clone(target[key]) : target[key];
		case "Object":
			return fast.object.clone(target[key]);
		default:
			return target[key];
	}
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
	modelGet
};
