/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import ExtError from "exterror"; 
import { ObjectId } from "mongodb";
import { Model } from "./model"; // Corrected import

// Define Sandstorm and other complex types as 'any' for now
type SandstormOrm = any; 
type ModelInstance = Model<any>; // Use Model<any> for a more specific 'any'
type SchemaType = any;
type AmuleCache = any;


/**
 *
 * @param {Object} object
 * @returns {boolean}
 */
export function isEmpty(object: Record<string, any>): boolean {
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
export function isPlainObject(value: any): boolean {
	return value !== null && typeof value === "object" && value.constructor === Object;
}

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {string} id
 * @param {function} callback
 */
export function ormGet(orm: SandstormOrm, name: string, id: string, callback: (err: any, doc?: any) => void): void {
	// Assuming orm.cache.get and orm.schemas are structured as expected.
	// The 'ObjectID' string literal for type check should be 'ObjectId' if that's the type name used in schemas.
	const objectIdToUse = (orm.schemas[name].properties.hasOwnProperty("_id") && orm.schemas[name].properties._id.type !== "ObjectId" ? id : new ObjectId(id));
	orm.cache.get(name, objectIdToUse, callback);
}

/**
 *
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {string} id
 * @param {function} callback
 */
export function getModel(orm: SandstormOrm, name: string, id: string, callback: (err: any, model?: ModelInstance | null) => void): void {
	ormGet(orm, name, id, (err: any, doc: any) => {
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
export async function docToModel(orm: SandstormOrm, name: string, doc: Record<string, any>): Promise<ModelInstance> {
	const model = new Model(orm, name, doc) as ModelInstance; // Cast to ModelInstance
	const {_id, ...data} = model.get();
	await model.set(data); // Assuming model.set returns a Promise
	return model;
}

/**
 *
 * @param {Object} object
 * @param {string} path
 * @param {function} callback
 * @returns {*}
 */
export function pathMap(object: Record<string, any>, path: string, callback: (value: any, key: string, target: any) => void): void {
	if (typeof object !== "object" || object === null) {
		throw new ExtError("ERR_PARAMETER_OBJECT_MUST_BE_OBJECT", "Parameter 'object' must be object, got " + typeof object);
	}
	if (typeof path !== "string") {
		throw new ExtError("ERR_PARAMETER_PATH_MUST_BE_STRING", "Parameter 'path' must be string, got " + typeof path);
	}
	if (typeof callback !== "function") {
		throw new ExtError("ERR_PARAMETER_CALLBACK_MUST_BE_FUNCTION", "Parameter 'callback' must be function, got " + typeof callback);
	}

	function _pathMap(currentObject: any, currentPath: string, current_key: string, origin: any): void {
		if (Array.isArray(currentObject)) {
			currentObject.map((item, key) => _pathMap(item, currentPath, key.toString(), currentObject));
			return;
		}
		if (!currentPath) {
			callback(currentObject, current_key, origin || currentObject);
			return;
		}
		const parts = currentPath.split(".");
		let part: string | undefined;
		let tempObject = currentObject;
		while ((part = parts.shift()) !== undefined) {
			if (!tempObject) {
				return;
			}
			const item = tempObject[part];
			if (item !== undefined) {
				if (Array.isArray(item)) {
					pathMap(item, parts.join("."), callback); // Recursive call for arrays
					return; // Stop processing this path further in this branch
				}
				if (!parts.length) {
					callback(item, current_key || part, tempObject);
					return;
				}
			}
			tempObject = item;
		}
	}

	_pathMap(object, path, "", object); // Initial call with object itself as origin
}

/**
 *
 * @param {Array} array
 * @param item
 */
export function pushUnique(array: any[], item: any): void {
	if (!array.includes(item)) {
		array.push(item);
	}
}

/**
 *
 * @param {Object} object
 * @param {Object} [options]
 * @returns {Object}
 */
export function objectToDotNotation(object: Record<string, any>, options?: { arrays?: boolean }): Record<string, any> {
	options = Object.assign({arrays: false}, options || {});
	const result: Record<string, any> = {};
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
function _objectToDotNotation(object: Record<string, any>, result: Record<string, any>, path: string[], options: { arrays?: boolean }): void {
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
export function modelGet(target: Record<string, any>, schema: SchemaType, key: string, path: string, dry: boolean): any {
	if (target[key] === undefined) {
		if (schema.required) {
			if (schema.default !== undefined) {
				return typeof schema.default === "function" ? schema.default() : schema.default;
			}
			throw new ExtError("ERR_MISSING_PROPERTY", "Missing required property '" + path + "'");
		}
		return undefined;
	}
	if (dry) {
		if (schema.type === "Array") {
			return target[key].map((item: any, akey: number, array: any[]) => {
				return modelGet(array, schema.item, akey.toString(), path + "." + akey, dry);
			});
		}
		if (schema.type === "Object") {
			if (!schema.properties || isEmpty(schema.properties)) {
				return target[key];
			}
			const res: Record<string, any> = {};
			Object.keys(schema.properties).map((okey: string) => {
				const value = modelGet(target[key], schema.properties[okey], okey, path + "." + okey, dry);
				if (value !== null && value !== undefined) {
					res[okey] = value;
				}
			});
			return res;
		}
		if (target[key] instanceof Model) { // Check against imported Model
			return (target[key] as ModelInstance).get({dry: true});
		}
	}
	return target[key];
}

interface SetTargetItemParams {
    types: Record<string, any>;
    model: ModelInstance;
    set: Record<string, any>;
    target: Record<string, any> | any[];
    target_key: string; // Can be string for object key or number for array index (converted to string)
    item: any;
    item_schema: SchemaType;
    type: string;
    key: string; // Original key for target (e.g. 'addresses')
    path: string; // Dot notation path
    value: any; // The actual value of 'item'
}
/**
 * @param {Object} parameters
...
 */
export async function setTargetItem(parameters: SetTargetItemParams): Promise<any> {
	let {types, model, set, target, target_key, item, item_schema, type, key, path, value} = parameters;

	const targetObject = target as Record<string, any>; // Assuming target is an object for simplicity here
    const setObject = set as Record<string, any>;

	if (type in types) {
		// Assuming types[type].set returns a Promise or is synchronous
		return types[type].set(model, targetObject[key], setObject[key], item_schema, target_key, path, item);
	}
	if (type in model.orm.schemas) {
		let itemToProcess: any = item;
		let pendingPromise: Promise<any> = Promise.resolve();

		if (typeof itemToProcess === "string") {
			itemToProcess = {_id: itemToProcess};
		}

		if (isPlainObject(itemToProcess)) {
			const data = Object.assign({}, itemToProcess);
			const _id = data._id;
			delete data._id;
			if (_id) {
				const nestedModel = await model.orm.get(type, _id) as ModelInstance;
				targetObject[key][target_key] = setObject[key][target_key] = nestedModel;
				return nestedModel.merge(data); // Assuming merge returns a Promise
			} else {
				itemToProcess = new Model(model.orm, type) as ModelInstance;
				pendingPromise = itemToProcess.set(data); // Assuming set returns a Promise
			}
		}

		if (itemToProcess instanceof Model) { // Check against imported Model
			if (itemToProcess.name === type) {
				targetObject[key][target_key] = setObject[key][target_key] = itemToProcess;
				return pendingPromise;
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
export function fieldOrSpecToName(fieldOrSpec: string | Record<string, any>): string {
    if (typeof fieldOrSpec === "string") {
        return fieldOrSpec;
    }
    // Correctly build the string from object parts
    return Object.entries(fieldOrSpec)
        .reduce((acc: string[], [key, value]) => acc.concat(key, value.toString()), [])
        .join("_");
}

// Model is imported at the top, so no need for late require here.
