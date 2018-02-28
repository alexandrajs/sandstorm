/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const fast = require("fast.js");
const types = require("./types");
const common = require("./common");
const {
	ArrayProperty, BooleanProperty, DateProperty, MixedProperty, ModelProperty, NumberProperty, ObjectProperty, ObjectIDProperty, StringProperty
} = require("./properties");
module.exports = Schema;

/**
 *
 * @param {Sandstorm} orm
 * @param options
 * @constructor
 */
function Schema(orm, options) {
	this.options = fast.assign({}, options || {});
	this.orm = orm;
}

/**
 *
 * @param {Object} schemas
 */
Schema.prototype.import = function (schemas) {
	fast.assign(this.orm.schemas, schemas);
};
/**
 *
 * @returns {Object}
 */
Schema.prototype.export = function () {
	return this.orm.schemas;
};
/**
 *
 * @param {string} name
 * @param {Object} blueprint
 */
Schema.prototype.register = function register(name, blueprint) {
	if (typeof name !== "string") {
		throw new TypeError("ERR_SCHEMA_NAME_MUST_BE_STRING");
	}
	if (name in this.orm.schemas) {
		throw new Error("ERR_SCHEMA_ALREADY_EXISTS");
	}
	if (!common.isPlainObject(blueprint)) {
		throw new TypeError("ERR_BLUEPRINT_MUST_BE_PLAIN_OBJECT");
	}
	if (name in types) {
		throw new Error("ERR_CANT_OVERWRITE_BASE_TYPE");
	}
	const dependencies = {};
	const dependents = {};
	const schema = {
		type: name,
		properties: {},
		dependencies: dependencies,
		dependents: dependents
	};
	this.orm.schemas[name] = schema;
	schema.properties = _parse(blueprint, [], schema, this.orm);
	return this.orm.schemas[name];
};
Schema.sort = function (blueprints) {
	const names = Object.keys(blueprints);
	const deps = {};

	function parse_obj(obj) {
		const deps = [];
		fast.forEach(obj, (prop) => {
			if (typeof prop === "string" && names.includes(prop)) {
				if (!(prop in types)) {
					common.pushUnique(deps, prop);
				}
			} else if (prop !== null && typeof prop === "object") {
				const inner_deps = parse_obj(prop);
				fast.array.forEach(inner_deps, (i) => {
					common.pushUnique(deps, i);
				});
			}
		});
		return deps;
	}

	function get_deps(blueprint) {
		return parse_obj(blueprint);
	}

	fast.array.forEach(names, (name) => {
		deps[name] = get_deps(blueprints[name]);
	});
	const list = [];

	function ok(name) {
		const d = deps[name];
		for (let i = 0; i < d.length; i++) {
			if (!~list.indexOf(d[i])) {
				return false;
			}
		}
		return true;
	}

	while (names.length) {
		const name = names.shift();
		if (ok(name)) {
			list[list.length] = name;
		} else {
			names[names.length] = name;
		}
	}
	const sorted = {};
	fast.array.forEach(list, (name) => {
		sorted[name] = blueprints[name];
	});
	return sorted;
};

/**
 *
 * @param {Object}object
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {{}}
 */
function _parse(object, path, schema, orm) {
	const output = {};
	fast.object.forEach(object, (value, key) => {
		path.push(key);
		const property = _parseProperty(value, path, schema, orm);
		output[key] = _expandProperty(property, path, schema, orm);
		path.pop();
	});
	return output;
}

/**
 *
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {*}
 */
function _expandProperty(property, path, schema, orm) {
	property.options = property.options || {};
	switch (property.type) {
		case "Boolean":
			return new BooleanProperty(property.options);
		case "Number":
			return new NumberProperty(property.options);
		case "String":
			return new StringProperty(property.options);
		case "Date":
			return new DateProperty(property.options);
		case "Array":
			return new ArrayProperty(property.options);
		case "Object":
			return new ObjectProperty(property.options);
		case "ObjectID":
			return new ObjectIDProperty(property.options);
		case "Mixed":
			return new MixedProperty(property.options);
		default:
			if (property.type in orm.schemas) {
				return new ModelProperty(fast.object.assign({}, property.options, {type: property.type}), path, schema);
			}
	}
	throw new TypeError("ERR_UNSUPPORTED_SCHEMA_PROPERTY_TYPE");
}

/**
 *
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {*}
 */
function _parseArrayProperty(property, path, schema, orm) {
	if (!property.length) {
		return {
			type: "Array",
			options: {item: _expandProperty({type: "Mixed"}, path, schema, orm)}
		};
	}
	if (typeof property[0] === "string") {
		if (property[0] in orm.schemas) {
			_addSchemaDependency(schema, path, property[0], orm, []);
			_addSchemaDependent(schema, path, property[0], orm, []);
		}
		return {
			type: "Array",
			options: {item: _expandProperty({type: property[0]}, path, schema, orm)}
		};
	}
	if (property[0] !== null && typeof property[0] === "object") {
		return {
			type: "Array",
			options: {item: _expandProperty(_parseObjectProperty(property[0], path, schema, orm), path, schema, orm)}
		};
	}
	throw new TypeError("ERR_UNSUPPORTED_ARRAY_ITEM_TYPE");
}

/**
 *
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {*}
 */
function _parseObjectProperty(property, path, schema, orm) {
	if (typeof property.type === "string") {
		if (property.type in orm.schemas) {
			_addSchemaDependency(schema, path, property.type, orm, property.search);
			_addSchemaDependent(schema, path, property.type, orm, property.search);
		}
		if (property.type === "Object" && typeof property.properties === "object" && property.properties !== null) {
			property.properties = _parse(property.properties, path, schema, orm);
		}
		if (property.type === "Array") {
			if (typeof property.item === "object" && property.item !== null) {
				property.item = _expandProperty(_parseProperty(property.item, path, schema, orm), path, schema, orm);
			} else if (typeof property.item === "string") {
				property.item = _expandProperty({type: property.item}, path, schema, orm);
			}
		}
		return {
			type: property.type,
			options: property
		};
	}
	return {
		type: "Object",
		options: {properties: _parse(property, path, schema, orm)}
	};
}

/**
 *
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {*}
 */
function _parseProperty(property, path, schema, orm) {
	const propertyType = typeof property;
	if (propertyType === "string") {
		if (property in orm.schemas) {
			_addSchemaDependency(schema, path, property, orm, []);
			_addSchemaDependent(schema, path, property, orm, []);
		}
		return {
			type: property,
			options: {}
		};
	} else if (property instanceof Array) {
		return _parseArrayProperty(property, path, schema, orm);
	} else if (propertyType === "object" && property !== null) {
		return _parseObjectProperty(property, path, schema, orm);
	}
	throw new TypeError("ERR_UNSUPPORTED_OBJECT_PROPERTY_TYPE");
}

/**
 *
 * @param {Object} schema
 * @param {Array} path
 * @param {String} name
 * @param {Sandstorm} orm
 * @param {Array} search
 */
function _addSchemaDependency(schema, path, name, orm, search) {
	const path_str = path.join(".");
	if (!(name in schema.dependencies)) {
		schema.dependencies[name] = {};
	}
	fast.object.assign(schema.dependencies[name], {[path_str]: search || []});
}

/**
 *
 * @param {Object} schema
 * @param {Array} path
 * @param {String} name
 * @param {Sandstorm} orm
 * @param {Array} search
 */
function _addSchemaDependent(schema, path, name, orm, search) {
	const path_str = path.join(".");
	const target = orm.schemas[name];
	if (!(schema.type in target.dependents)) {
		target.dependents[schema.type] = {};
	}
	fast.object.assign(target.dependents[schema.type], {[path_str]: search || []});
}

// noinspection JSUnusedGlobalSymbols
Schema[Symbol.for("private")] = {
	_addSchemaDependency,
	_addSchemaDependent,
	_expandProperty,
	_parse,
	_parseArrayProperty,
	_parseObjectProperty,
	_parseProperty
};
