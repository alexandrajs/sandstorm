/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as types from "./types";
import * as common from "./common";
import {
    ArrayProperty, BooleanProperty, DateProperty, MixedProperty, ModelProperty, NumberProperty, ObjectProperty, ObjectIDProperty, StringProperty
} from "./properties";
import ExtError from "exterror";

// Placeholder for Sandstorm ORM type
type SandstormOrm = any;

export interface IndexDefinition {
    fieldOrSpec: string | Record<string, any>;
    options?: Record<string, any>;
    collation?: Record<string, any>; // Added this as it's used in register
}

interface SchemaOptions {
    indexes?: IndexDefinition[];
    collation?: Record<string, any>;
    // Add other options used by schemas if any
}

export interface Blueprint {
    $options?: SchemaOptions;
    [key: string]: any; // Properties of the schema
}

export interface ParsedProperty {
    type: string;
    options: Record<string, any>;
    // Representing the structure returned by _parseProperty, _parseArrayProperty, _parseObjectProperty
    item?: ParsedProperty | any; // For ArrayProperty
    properties?: Record<string, ParsedProperty>; // For ObjectProperty
    embed?: any[]; // For ModelProperty
}


interface SchemaDefinition {
    type: string;
    properties: Record<string, any>; // Will hold instances of Property classes
    dependencies: Record<string, Record<string, any[]>>;
    dependents: Record<string, Record<string, any[]>>;
    options: SchemaOptions;
}

export interface SchemaDefinition { // Exporting this interface
    type: string;
    properties: Record<string, any>; 
    dependencies: Record<string, Record<string, any[]>>;
    dependents: Record<string, Record<string, any[]>>;
    options: SchemaOptions;
}


/**
 * @constructor
 */
export class Schema {
    public options: SchemaOptions;
    public orm: SandstormOrm;

    /**
     *
     * @param {Sandstorm} orm
     * @param {Object} [options]
     */
    constructor(orm: SandstormOrm, options?: SchemaOptions) {
        this.options = Object.assign({}, options || {});
        this.orm = orm;
    }

    /**
     * Import blueprints
     * @param {Object} schemas
     */
    import(schemas: Record<string, SchemaDefinition>): void {
        Object.assign(this.orm.schemas, schemas);
    }

    /**
     * Export registered blueprints
     * @returns {Object}
     */
    export(): Record<string, SchemaDefinition> {
        return this.orm.schemas;
    }

    /**
     * Register blueprint with given name
     * @param {string} name
     * @param {Object} blueprint
     */
    register(name: string, blueprint: Blueprint): SchemaDefinition {
        if (typeof name !== "string") {
            throw new ExtError("ERR_SCHEMA_NAME_MUST_BE_STRING", `Expected parameter 'name' to be string, got ${typeof name}`);
        }
        if (name in this.orm.schemas) {
            throw new ExtError("ERR_SCHEMA_ALREADY_EXISTS", `Schema '${name}' already exists`);
        }
        if (!common.isPlainObject(blueprint)) {
            throw new ExtError("ERR_BLUEPRINT_MUST_BE_PLAIN_OBJECT", `Expected parameter 'blueprint' to be plain object, got ${typeof blueprint}`);
        }
        const blueprintOptions = blueprint.$options;
        if (blueprintOptions && !common.isPlainObject(blueprintOptions)) {
            throw new ExtError("ERR_OPTIONS_MUST_BE_PLAIN_OBJECT", `Expected parameter 'options' to be plain object, got ${typeof blueprintOptions}`);
        }
        if (name in (types as any)) { // Cast types to any to check keys
            throw new ExtError("ERR_CANT_OVERWRITE_BASE_TYPE", `Can not overwrite base type '${name}'`);
        }
        const dependencies: Record<string, Record<string, any[]>> = {};
        const dependents: Record<string, Record<string, any[]>> = {};
        
        const schema: SchemaDefinition = {
            type: name,
            properties: {},
            dependencies: dependencies,
            dependents: dependents,
            options: blueprintOptions || {}
        };
        delete blueprint.$options; // Remove $options before parsing properties
        this.orm.schemas[name] = schema;
        schema.properties = _parse(blueprint, [], schema, this.orm);
        return this.orm.schemas[name];
    }

    /**
     * Order blueprints in order to satisfy dependencies
     * @param {Object} blueprints
     * @returns {Object}
     */
    static sort(blueprints: Record<string, Blueprint>): Record<string, Blueprint> {
        const names = Object.keys(blueprints);
        const dependenciesMap: Record<string, string[]> = {};

        function parse_obj(object: Record<string, any>, currentNames: string[]): string[] {
            const deps: string[] = [];
            Object.entries(object).forEach(([key, property]) => {
                if (key[0] === "$") { // Skip $options etc.
                    return;
                }
                if (typeof property === "string" && currentNames.includes(property)) {
                    if (!((types as any)[property])) { // Check if it's a custom type (schema name)
                        common.pushUnique(deps, property);
                    }
                } else if (property !== null && typeof property === "object") {
                    // For nested objects or arrays, recursively find dependencies
                    const inner_dependencies = parse_obj(property as Record<string, any>, currentNames);
                    inner_dependencies.forEach((depName) => {
                        common.pushUnique(deps, depName);
                    });
                }
            });
            return deps;
        }

        names.forEach((name) => {
            dependenciesMap[name] = parse_obj(blueprints[name], names);
        });

        const sortedList: string[] = [];
        const processingNames = [...names]; // Clone names to modify it

        // Kahn's algorithm for topological sort could be an alternative here
        // This is a simple iterative approach
        let changedInIteration = true;
        while (processingNames.length > 0 && changedInIteration) {
            changedInIteration = false;
            for (let i = processingNames.length - 1; i >= 0; i--) {
                const name = processingNames[i];
                const deps = dependenciesMap[name];
                if (deps.every(dep => sortedList.includes(dep))) {
                    sortedList.push(name);
                    processingNames.splice(i, 1);
                    changedInIteration = true;
                }
            }
        }
        
        if(processingNames.length > 0) {
            // If there are still names left, there's a circular dependency
            throw new ExtError("ERR_CIRCULAR_DEPENDENCY", `Circular dependency detected in schemas involving: ${processingNames.join(', ')}`);
        }

        const sortedBlueprints: Record<string, Blueprint> = {};
        sortedList.forEach((name) => {
            sortedBlueprints[name] = blueprints[name];
        });
        return sortedBlueprints;
    }
}

// module.exports = Schema; // Replaced by export class Schema

/**
 * @private
 */
function _parse(object: Record<string, any>, path: string[], schema: SchemaDefinition, orm: SandstormOrm): Record<string, any> {
    const output: Record<string, any> = {};
    Object.entries(object).forEach(([key, value]) => {
        if (key === '$options') return; // Skip $options
        path.push(key);
        const property = _parseProperty(value, path, schema, orm);
        output[key] = _expandProperty(property, path, schema, orm);
        path.pop();
    });
    return output;
}

/**
 * @private
 */
function _expandProperty(property: ParsedProperty, path: string[], schema: SchemaDefinition, orm: SandstormOrm): any {
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
            // Ensure item is correctly expanded for ArrayProperty constructor
            if (property.options.item && typeof property.options.item.type === 'string') { // property.options.item should be a ParsedProperty
                 property.options.item = _expandProperty(property.options.item, path.concat('[]'), schema, orm);
            }
            return new ArrayProperty(property.options);
        case "Object":
             // Ensure properties are correctly expanded for ObjectProperty constructor
            if (property.options.properties) {
                const expandedSubProperties: Record<string, any> = {};
                for(const subKey in property.options.properties) {
                    expandedSubProperties[subKey] = _expandProperty(property.options.properties[subKey], path.concat(subKey), schema, orm);
                }
                property.options.properties = expandedSubProperties;
            }
            return new ObjectProperty(property.options);
        case "ObjectID":
            return new ObjectIDProperty(property.options);
        case "Mixed":
            return new MixedProperty(property.options);
        default:
            if (property.type in orm.schemas) {
                _addSchemaDependency(schema, path, property.type, orm, property.options.embed || []);
                _addSchemaDependent(schema, path, property.type, orm); // embed removed from here, as it's part of options
                return new ModelProperty(Object.assign({}, property.options, {type: property.type}), path.join('.'), schema); // path for ModelProperty expects string
            }
    }
    throw new ExtError("ERR_UNSUPPORTED_SCHEMA_PROPERTY_TYPE", `Unsupported property type '${property.type}' at path '${path.join('.')}'`);
}

/**
 * @private
 */
function _parseArrayProperty(propertyArray: any[], path: string[], schema: SchemaDefinition, orm: SandstormOrm): ParsedProperty {
    if (!propertyArray.length) {
        return {
            type: "Array",
            options: { item: _expandProperty({ type: "Mixed", options: {} }, path, schema, orm) }
        };
    }
    const itemDefinition = propertyArray[0];
    let itemProperty: ParsedProperty;
    if (typeof itemDefinition === "string") {
        itemProperty = { type: itemDefinition, options: {} };
    } else if (itemDefinition !== null && typeof itemDefinition === "object") {
        itemProperty = Array.isArray(itemDefinition) ?
            _parseArrayProperty(itemDefinition, path, schema, orm) :
            _parseObjectProperty(itemDefinition, path, schema, orm);
    } else {
        throw new ExtError("ERR_UNSUPPORTED_ARRAY_ITEM_TYPE", `Unsupported array item type in '${path.join(".")}'`);
    }
    return {
        type: "Array",
        options: { item: itemProperty } // item here is a ParsedProperty to be expanded later by _expandProperty if needed
    };
}

/**
 * @private
 */
function _parseObjectProperty(propertyObject: Record<string, any>, path: string[], schema: SchemaDefinition, orm: SandstormOrm): ParsedProperty {
    if (typeof propertyObject.type === "string") { // Explicitly typed object (e.g. { type: "Object", properties: {...} })
        const options = { ...propertyObject };
        delete options.type; // Remove type from options passed to property constructor

        if (propertyObject.type === "Object" && typeof propertyObject.properties === "object" && propertyObject.properties !== null) {
            options.properties = _parse(propertyObject.properties, path, schema, orm);
        }
        if (propertyObject.type === "Array" && propertyObject.item) {
             if (typeof propertyObject.item === "object" && propertyObject.item !== null) {
                options.item = _parseProperty(propertyObject.item, path.concat('[]'), schema, orm);
            } else if (typeof propertyObject.item === "string") {
                options.item = { type: propertyObject.item, options: {} };
            }
        }
        return {
            type: propertyObject.type,
            options: options
        };
    }
    // Implicitly an object if it's a plain object without a 'type' field.
    return {
        type: "Object",
        options: { properties: _parse(propertyObject, path, schema, orm) }
    };
}

/**
 * @private
 */
function _parseProperty(property: any, path: string[], schema: SchemaDefinition, orm: SandstormOrm): ParsedProperty {
    const propertyType = typeof property;
    if (propertyType === "string") {
        return {
            type: property as string,
            options: {}
        };
    } else if (Array.isArray(property)) {
        return _parseArrayProperty(property, path, schema, orm);
    } else if (propertyType === "object" && property !== null) {
        return _parseObjectProperty(property, path, schema, orm);
    }
    throw new ExtError("ERR_UNSUPPORTED_OBJECT_PROPERTY_TYPE", `Unsupported object property type in '${path.join(".")}'`);
}

/**
 * @private
 */
function _addSchemaDependency(schema: SchemaDefinition, path: string[], name: string, orm: SandstormOrm, embed: any[]): void {
    const path_str = path.join(".");
    if (!(name in schema.dependencies)) {
        schema.dependencies[name] = {};
    }
    schema.dependencies[name][path_str] = embed || [];
}

/**
 * @private
 */
function _addSchemaDependent(schema: SchemaDefinition, path: string[], name: string, orm: SandstormOrm, embed?: any[]): void { // embed is optional here
    const path_str = path.join(".");
    const targetSchema = orm.schemas[name] as SchemaDefinition; // Assume orm.schemas stores SchemaDefinition
    if (!(schema.type in targetSchema.dependents)) {
        targetSchema.dependents[schema.type] = {};
    }
    targetSchema.dependents[schema.type][path_str] = embed || [];
}

function _setUniqueIndexOption(schema: SchemaDefinition, property: any, path: string[]): void {
    // Implementation seems to be missing or was intended for future use.
}

// noinspection JSUnusedGlobalSymbols
(Schema as any)[Symbol.for("private")] = { // This remains a static-like property assignment
    _addSchemaDependency,
    _addSchemaDependent,
    _expandProperty,
    _parse,
    _parseArrayProperty,
    _parseObjectProperty,
    _parseProperty,
    _setUniqueIndexOption
};
