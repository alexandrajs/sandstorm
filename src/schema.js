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
const ExtError = require("exterror");

/**
 *
 * @param {Sandstorm} orm
 * @param {Object} options
 * @constructor
 */
function Schema(orm, options) {
	this.options = fast.assign({}, options || {});
	this.orm = orm;
}

/**
 * Import blueprints
 * @param {Object} schemas
 */
Schema.prototype.import = function (schemas) {
	fast.assign(this.orm.schemas, schemas);
};
/**
 * Export registered blueprints
 * @returns {Object}
 */
Schema.prototype.export = function () {
	return this.orm.schemas;
};
/**
 * Register blueprint with given name
 * @param {string} name
 * @param {Object} blueprint
 * @param {Object} options
 */
Schema.prototype.register = function register(name, blueprint, options) {
	if (typeof name !== "string") {
		throw new ExtError("ERR_SCHEMA_NAME_MUST_BE_STRING", "Expected parameter 'name' to be string, got " + typeof name);
	}
	if (name in this.orm.schemas) {
		throw new ExtError("ERR_SCHEMA_ALREADY_EXISTS", "Schema '" + name + "' already exists");
	}
	if (!common.isPlainObject(blueprint)) {
		throw new ExtError("ERR_BLUEPRINT_MUST_BE_PLAIN_OBJECT", "Expected parameter 'blueprint' to be plain object, got " + typeof blueprint);
	}
	if (options && !common.isPlainObject(options)) {
		throw new ExtError("ERR_OPTIONS_MUST_BE_PLAIN_OBJECT", "Expected parameter 'options' to be plain object, got " + typeof options);
	}
	if (name in types) {
		throw new ExtError("ERR_CANT_OVERWRITE_BASE_TYPE", "Can not overwrite base type '" + name + "'");
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
/**
 * Order blueprints in order to satisfy dependencies
 * @param {Object} blueprints
 * @returns {Object}
 */
Schema.sort = function (blueprints) {
	const names = Object.keys(blueprints);
	const dependencies = {};

	function parse_obj(object) {
		const dependencies = [];
		fast.forEach(object, (property) => {
			if (typeof property === "string" && names.includes(property)) {
				if (!(property in types)) {
					common.pushUnique(dependencies, property);
				}
			} else if (property !== null && typeof property === "object") {
				const inner_dependencies = parse_obj(property);
				fast.array.forEach(inner_dependencies, (index) => {
					common.pushUnique(dependencies, index);
				});
			}
		});
		return dependencies;
	}

	function get_dependencies(blueprint) {
		return parse_obj(blueprint);
	}

	fast.array.forEach(names, (name) => {
		dependencies[name] = get_dependencies(blueprints[name]);
	});
	const list = [];

	function ok(name) {
		const dependency = dependencies[name];
		for (let index = 0; index < dependency.length; index++) {
			if (!~list.indexOf(dependency[index])) {
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
 * @private
 * @param {Object}object
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {Object}
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
 * @private
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
				_addSchemaDependency(schema, path, property.type, orm, property.options.embed);
				_addSchemaDependent(schema, path, property.type, orm, property.options.embed);
				return new ModelProperty(fast.object.assign({}, property.options, {type: property.type}), path, schema);
			}
	}
	throw new ExtError("ERR_UNSUPPORTED_SCHEMA_PROPERTY_TYPE", "Unsupported property type '" + property.type + "'");
}

/**
 * @private
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {{type:string,options:Object}}
 */
function _parseArrayProperty(property, path, schema, orm) {
	if (!property.length) {
		return {
			type: "Array",
			options: {item: _expandProperty({type: "Mixed"}, path, schema, orm)}
		};
	}
	if (typeof property[0] === "string") {
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
	throw new ExtError("ERR_UNSUPPORTED_ARRAY_ITEM_TYPE", "Unsupported array item type in '" + path.join(".") + "'");
}

/**
 * @private
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {{type:string,options:Object}}
 */
function _parseObjectProperty(property, path, schema, orm) {
	if (typeof property.type === "string") {
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
 * @private
 * @param property
 * @param {Array} path
 * @param {Object} schema
 * @param {Sandstorm} orm
 * @returns {*}
 */
function _parseProperty(property, path, schema, orm) {
	const propertyType = typeof property;
	if (propertyType === "string") {
		return {
			type: property,
			options: {}
		};
	} else if (property instanceof Array) {
		return _parseArrayProperty(property, path, schema, orm);
	} else if (propertyType === "object" && property !== null) {
		return _parseObjectProperty(property, path, schema, orm);
	}
	throw new ExtError("ERR_UNSUPPORTED_OBJECT_PROPERTY_TYPE", "Unsupported object property type in '" + path.join(".") + "'");
}

/**
 * @private
 * @param {Object} schema
 * @param {Array} path
 * @param {String} name
 * @param {Sandstorm} orm
 * @param {Array} embed
 */
function _addSchemaDependency(schema, path, name, orm, embed) {
	const path_str = path.join(".");
	if (!(name in schema.dependencies)) {
		schema.dependencies[name] = {};
	}
	fast.object.assign(schema.dependencies[name], {[path_str]: embed || []});
}

/**
 * @private
 * @param {Object} schema
 * @param {Array} path
 * @param {String} name
 * @param {Sandstorm} orm
 * @param {Array} embed
 */
function _addSchemaDependent(schema, path, name, orm, embed) {
	const path_str = path.join(".");
	const target = orm.schemas[name];
	if (!(schema.type in target.dependents)) {
		target.dependents[schema.type] = {};
	}
	fast.object.assign(target.dependents[schema.type], {[path_str]: embed || []});
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
