/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Model = require("./model");
const fast = require("fast.js");

/**
 *
 * @param {Object} object
 * @param {Function} callback
 * @returns {Object}
 */
function map(object, callback) {
	const output = {};
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			output[key] = callback(object[key], key, object);
		}
	}
	return output;
}

/**
 *
 * @param {Object} object
 * @param {Function} callback
 * @returns {Object}
 */
function filter(object, callback) {
	const output = {};
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			if (callback(object[key], key, object)) {
				output[key] = object[key];
			}
		}
	}
	return output;
}

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
 * @param value
 * @returns {boolean}
 */
function isPlainObject(value) {
	return value !== null && typeof value === "object" && value.constructor === Object;
}

/**
 *
 * @param str
 * @returns {string}
 */
function unPascalCase(str) {
	return str[0].toLowerCase() + str.slice(1).replace(/[A-Z]/g, (chr) => "_" + chr.toLowerCase());
}

/**
 *
 * @param orm
 * @param name
 * @param id
 * @param callback
 */
function ormGet(orm, name, id, callback) {
	orm.cache.get(name, id, callback);
}

/**
 *
 * @param orm
 * @param name
 * @param id
 * @param callback
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
 * @param orm
 * @param name
 * @param doc
 * @returns {Model}
 */
function docToModel(orm, name, doc) {
	return new Model(orm, name, doc);
}

/**
 *
 * @param object
 * @param path
 * @param callback
 * @returns {*}
 */
function pathMap(object, path, callback) {
	if (typeof object !== "object" || object === null) {
		throw new TypeError("Parameter 'object' must be object", "");
	}
	if (typeof path !== "string") {
		throw new TypeError("Parameter 'path' must be string", "");
	}
	if (typeof callback !== "function") {
		throw new TypeError("Parameter 'path' must be string", "");
	}
	const parts = path.split(".");
	let current;
	while (current = parts.shift()) {
		const item = object[current];
		if (item !== undefined) {
			if (!parts.length) {
				return void callback(item, current, object);
			}
			if (current === "$") {
				if (object instanceof Array) {
					if (!parts.length) {
						return fast.array.forEach(object, (item, key) => callback(item, key, object));
					}
					const array_path = parts.join(parts);
					fast.array.forEach(object, (item) => pathMap(item, array_path, callback));
				}
			}
		}
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
 * @param object
 * @param options
 * @returns {Object}
 */
function objectToDotNotation(object, options) {
	options = fast.assign({arrays: false}, options || {});
	const result = {};
	_objectToDotNotation_object(object, result, [], options);
	return result;
}

function _objectToDotNotation_object(object, result, path, options) {
	fast.object.forEach(object, (value, key) => {
		path.push(key);
		if (value instanceof Array && options.arrays) {
			_objectToDotNotation_array(value, result, path, options);
		} else if (typeof value === 'object' && value !== null) {
			_objectToDotNotation_object(value, result, path, options);
		} else {
			result[path.join('.')] = value;
		}
		path.pop();
	});
}

function _objectToDotNotation_array(array, result, path, options) {
	fast.array.forEach(array, (value, key) => {
		path.push(key);
		if (value instanceof Array && options.arrays) {
			_objectToDotNotation_object(value, result, path, options);
		} else if (typeof value === 'object' && value !== null) {
			_objectToDotNotation_object(value, result, path, options);
		} else {
			result[path.join('.')] = value;
		}
		path.pop();
	});
}

module.exports = {
	map,
	filter,
	isEmpty,
	isPlainObject,
	unPascalCase,
	ormGet,
	getModel,
	docToModel,
	pathMap,
	pushUnique,
	objectToDotNotation
};
