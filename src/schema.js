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
 * @param orm
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
 * @param name
 * @param blueprint
 */
Schema.prototype.register = function register(name, blueprint) {
	if (typeof name !== "string") {
		throw new TypeError("Schema name must be string", "ERR_SCHEMA_NAME_MUST_BE_STRING");
	}
	if (name in this.orm.schemas) {
		throw new Error("Schema already exists", "ERR_SCHEMA_ALREADY_EXISTS");
	}
	if (!common.isPlainObject(blueprint)) {
		throw new TypeError("Blueprint must be object", "ERR_BLUEPRINT_MUST_BE_PLAIN_OBJECT");
	}
	if (name in types) {
		throw new Error("Can't overwrite base type", "ERR_CANT_OVERWRITE_BASE_TYPE");
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
	schema.properties = parse(blueprint, [], schema, this.orm);
	return this.orm.schemas[name];
};

/**
 *
 * @param object
 * @param path
 * @param schema
 * @param orm
 * @returns {{}}
 */
function parse(object, path, schema, orm) {
	const output = {};
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			path.push(key);
			const property = parseProperty(object[key], path, schema, orm);
			output[key] = expandProperty(property, path, schema, orm);
			path.pop();
		}
	}
	return output;
}

/**
 *
 * @param property
 * @param path
 * @param schema
 * @param orm
 * @returns {*}
 */
function expandProperty(property, path, schema, orm) {
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
				return new ModelProperty(property, path, schema);
			}
	}
	throw new TypeError("Unsupported property type '" + property.type + "'", "ERR_UNSUPPORTED_SCHEMA_PROPERTY_TYPE");
}

/**
 *
 * @param property
 * @param path
 * @param schema
 * @param orm
 * @returns {*}
 */
function parseArrayProperty(property, path, schema, orm) {
	if (!property.length) {
		return {
			type: "Array",
			options: {item: expandProperty({type: "Mixed"}, path, schema, orm)}
		};
	}
	if (typeof property[0] === "string") {
		if (property[0] in orm.schemas) {
			addSchemaDependency(schema, path, property[0], orm);
			addSchemaDependent(schema, path, property[0], orm);
		}
		return {
			type: "Array",
			options: {item: expandProperty({type: property[0]}, path, schema, orm)}
		};
	}
	if (property[0] !== null && typeof property[0] === "object") {
		path.push("$");
		const obj = {
			type: "Array",
			options: {item: expandProperty(parseProperty(property[0], path, schema, orm), path, schema, orm)}
		};
		path.pop();
		return obj;
	}
	throw new TypeError("Unsupported Array item type", "ERR_UNSUPPORTED_ARRAY_ITEM_TYPE");
}

/**
 *
 * @param property
 * @param path
 * @param schema
 * @param orm
 * @returns {*}
 */
function parseObjectProperty(property, path, schema, orm) {
	if (typeof property.type === "string") {
		if (property.type in orm.schemas) {
			addSchemaDependency(schema, path, property.type, orm, property.search);
			addSchemaDependent(schema, path, property.type, orm, property.search);
		}
		if (property.type === "Object" && typeof property.properties === "object" && property.properties !== null) {
			property.properties = parse(property.properties, path, schema, orm);
		}
		if (property.type === "Array") {
			if (typeof property.item === "object" && property.item !== null) {
				property.item = expandProperty(parseProperty(property.item, path, schema, orm), path, schema, orm);
			} else if (typeof property.item === "string") {
				property.item = expandProperty({type: property.item}, path, schema, orm);
			}
		}
		return {
			type: property.type,
			options: property
		};
	}
	return {
		type: "Object",
		options: {properties: parse(property, path, schema, orm)}
	};
}

/**
 *
 * @param property
 * @param path
 * @param schema
 * @param orm
 * @returns {*}
 */
function parseProperty(property, path, schema, orm) {
	const propertyType = typeof property;
	if (propertyType === "string") {
		if (property in orm.schemas) {
			addSchemaDependency(schema, path, property, orm);
			addSchemaDependent(schema, path, property, orm);
		}
		return {
			type: property,
			options: {}
		};
	} else if (property instanceof Array) {
		return parseArrayProperty(property, path, schema, orm);
	} else if (propertyType === "object" && property !== null) {
		return parseObjectProperty(property, path, schema, orm);
	}
	throw new TypeError("Unsupported 'property' (" + path + ") type", "ERR_UNSUPPORTED_OBJECT_PROPERTY_TYPE");
}

/**
 *
 * @param schema
 * @param path
 * @param name
 * @param orm
 * @param search
 */
function addSchemaDependency(schema, path, name, orm, search) {
	path = path.join(".");
	if (!(name in schema.dependencies)) {
		schema.dependencies[name] = {};
	}
	fast.object.assign(schema.dependencies[name], {[path]: search || []});
}

/**
 *
 * @param schema
 * @param path
 * @param name
 * @param orm
 * @param search
 */
function addSchemaDependent(schema, path, name, orm, search) {
	path = path.join(".");
	const target = orm.schemas[name];
	if (!(schema.type in target.dependents)) {
		target.dependents[schema.type] = {};
		return;
	}
	fast.object.assign(target.dependents[schema.type], {[path]: search || []});
}
