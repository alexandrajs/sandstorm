/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import ExtError from "exterror"; 
import { ObjectId, Db as MongoDBDb, Collection as MongoDBCollection, UpdateResult, InsertOneResult, DeleteResult, FindCursor, ReplaceOneResult, Filter, UpdateFilter, FindOneAndUpdateOptions, Document as MongoDocument, WithId, ModifyResult, MatchKeysAndValues, OptionalUnlessRequiredId } from "mongodb"; 

import * as types from "./types";
import * as common from "./common"; 
import { Sandstorm } from "./sandstorm"; 
import { SchemaDefinition } from "./schema"; 

// Interfaces for Model
export interface ModelData extends Record<string, any> {
    _id?: ObjectId | string;
}

interface ModelSetOperation extends Record<string, any> {}

interface ModelHydrated extends Array<string> {}

interface GetOptions {
    dry?: boolean;
    key?: string; 
    properties?: string[] | null;
}

interface SaveOptions {
    key?: string;
}

export interface SaveResult {
    _id: ObjectId | string;
    method: string;
    result: { ok: number; n: number; nModified?: number };
    modifiedCount: number;
    upsertedId?: ObjectId;
    upsertedCount: number;
    matchedCount: number;
    insertedCount: number;
    insertedId?: ObjectId | string;
}


/**
 * @constructor
 */
export class Model<TData extends ModelData = ModelData> {
    public orm: Sandstorm;
    public name: string;
    public schema: SchemaDefinition;
    public data: TData;
    public overwrite: boolean;
    public _set: ModelSetOperation; 
    public _hydrated: ModelHydrated; 

    constructor(orm: Sandstorm, name: string, data?: Partial<TData>) {
        this.orm = orm;
        this.name = name;
        this.schema = this.orm.schemas[name]; 
        this.data = Object.assign({}, data || {}) as TData;
        this.overwrite = false;
        this._set = {};
        this._hydrated = [];
    }

    set(properties: Partial<TData>): Promise<Model<TData>> {
        if (!properties || typeof properties !== "object") {
            return Promise.reject(new ExtError("ERR_MISSING_PROPERTIES_TO_SET", "Missing properties to set"));
        }
        return _set<TData>(this, properties, false);
    }

    merge(properties: Partial<TData>): Promise<Model<TData>> {
        if (!properties || typeof properties !== "object") {
            return Promise.reject(new ExtError("ERR_MISSING_PROPERTIES_TO_MERGE", "Missing properties to merge"));
        }
        return _set<TData>(this, properties, true);
    }

    get(options?: GetOptions): Partial<TData> {
        options = options || { dry: false };
        return _get<TData>(this, options);
    }

    /**
	 * @returns 
	 */
	async save(): Promise<SaveResult> {
		const merge = !!(this.data._id && !this.overwrite); // Ensure boolean
		const key = merge ? "_set" : "data";
		await _save_embedded(this, {key});
		this.dehydrate({key});
		let result: SaveResult;
		if (merge) {
			result = await new Promise<SaveResult>((resolve, reject) => {
				_save_merge(this, resolve, reject);
			});
		} else {
			result = await new Promise<SaveResult>((resolve, reject) => {
				_save_set(this, resolve, reject);
			});
		}
		this.overwrite = false;
		return result;
	}

	/**
	 *
	 * @returns 
	 */
	async delete(): Promise<void> { // _delete now returns Promise<void> or throws
		return _delete(this);
	}

	/**
	 *
	 * @param names
	 * @returns 
	 */
	hydrate(names?: string[]): Promise<Model<TData>> {
		return _hydrate(this, names);
	}

	/**
	 * @returns 
	 */
	dehydrate(options?: SaveOptions): this {
		_dehydrate(this, options);
		return this;
	}

	/**
	 *
	 * @returns 
	 */
	toJSON(): TData {
		return this.data;
	}
}

// No module.exports needed due to 'export class Model'

/**
 *
 * @param model
 * @param resolve
 * @param reject
 * @private
 */
async function _save_set<TData extends ModelData>(
    model: Model<TData>, 
    resolve: (value: SaveResult) => void, 
    reject: (reason?: any) => void
): Promise<void> {
    try {
        if (!model.orm.db) throw new ExtError("ERR_DB_NOT_CONNECTED", "Database not connected in ORM.");
        const collection: MongoDBCollection<TData> = model.orm.db.collection<TData>(model.name);
        const doc = _get(model, { dry: true }) as TData; // Assume _get returns TData
        let method: string;
        let mongoResult: InsertOneResult<TData> | ReplaceOneResult;

        if (model.data._id) {
            method = "replace";
            const docToReplace = { ...doc };
            // If schema manages _id as string, ensure it's passed as string.
            // MongoDB replaceOne filter should correctly match ObjectId or string _id.
            // The document itself should be TData.
            mongoResult = await collection.replaceOne({ _id: model.data._id } as Filter<TData>, docToReplace as TData, { upsert: true });
        } else {
            method = "insert";
            // Let MongoDB generate _id if not defined in schema, or if it is an ObjectId type not provided.
            // If schema defines _id as string and it's provided in doc, it should be used.
            const docToInsert: OptionalUnlessRequiredId<TData> = { ...doc } as OptionalUnlessRequiredId<TData>;
             if (!model.schema.properties._id && docToInsert.hasOwnProperty('_id')) { // If schema has no _id, mongo generates it
                delete (docToInsert as any)._id;
            } else if (model.schema.properties._id && model.schema.properties._id.type === 'ObjectID' && !docToInsert._id) {
                 delete (docToInsert as any)._id; // Let mongo generate if schema expects ObjectId and it's not provided
            }
            // If _id is string and provided in doc, it will be used.

            mongoResult = await collection.insertOne(docToInsert);
            if (mongoResult.insertedId) {
                doc._id = mongoResult.insertedId; 
            }
        }
        model._set = {};
        model.data._id = doc._id; 
        if(model.orm.cache && doc._id) await model.orm.cache.delete(model.name, doc._id.toString()); 

        const replaceOpResult = mongoResult as ReplaceOneResult; // For upsertedId, matchedCount etc.
        const insertOpResult = mongoResult as InsertOneResult<TData>; // For insertedId

        resolve({
            _id: doc._id!,
            method,
            result: { ok: 1, n: (replaceOpResult.matchedCount || 0) + (replaceOpResult.upsertedCount || 0) + (insertOpResult.insertedId ? 1 : 0) },
            modifiedCount: replaceOpResult.modifiedCount || 0,
            upsertedId: replaceOpResult.upsertedId as ObjectId | undefined, // From ReplaceOneResult
            upsertedCount: replaceOpResult.upsertedCount || 0,
            matchedCount: replaceOpResult.matchedCount || 0,
            insertedCount: insertOpResult.insertedId ? 1 : 0,
            insertedId: insertOpResult.insertedId || (method === "insert" ? doc._id : undefined)
        });
    } catch (err) {
        reject(err);
    }
}

/**
 *
 * @param model
 * @param resolve
 * @param reject
 * @private
 */
async function _save_merge<TData extends ModelData>(
    model: Model<TData>, 
    resolve: (value: SaveResult) => void, 
    reject: (reason?: any) => void
): Promise<void> {
    if (!model.data._id) {
        return reject(new ExtError("ERR_MISSING_ID_ON_MERGE_SAVE", "Missing '_id' on merge save"));
    }
    if (!model.orm.db) {
        return reject(new ExtError("ERR_DB_NOT_CONNECTED", "Database not connected in ORM."));
    }

    const _id = model.data._id;
    const method = "update";
    if (common.isEmpty(model._set)) {
        return resolve({
            _id,
            method,
            result: { ok: 1, n: 1, nModified: 0 },
            modifiedCount: 0,
            upsertedId: undefined,
            upsertedCount: 0,
            matchedCount: 1,
            insertedCount: 0,
            insertedId: undefined
        });
    }
    // common.objectToDotNotation returns Record<string, any>.
    // For $set, MongoDB expects fields of TData. If dot notation is used, it implies sub-fields.
    // This needs to be compatible with MatchKeysAndValues<TData>.
    const setPayload = common.objectToDotNotation(_get(model, { dry: true, key: "_set", properties: Object.keys(model._set) })) as Partial<TData>;
    const updatePayload: UpdateFilter<TData> = { $set: setPayload };
    
    try {
        const collection: MongoDBCollection<TData> = model.orm.db.collection<TData>(model.name);
        model._set = {};
        const mongoResult: UpdateResult | MongoDocument = await collection.updateOne({ _id: _id } as Filter<TData>, updatePayload, { upsert: true });
        
        const updateResult = mongoResult as UpdateResult; 

        if(model.orm.cache && model.data._id) await model.orm.cache.delete(model.name, model.data._id.toString());

        const { modifiedCount, upsertedId, upsertedCount, matchedCount } = updateResult;

        resolve({
            _id,
            method,
            result: { ok: 1, n: (matchedCount || 0) + (upsertedCount || 0), nModified: modifiedCount || 0 },
            modifiedCount: modifiedCount || 0,
            upsertedId: upsertedId as ObjectId | undefined,
            upsertedCount: upsertedCount || 0,
            matchedCount: matchedCount || 0,
            insertedCount: 0,
            insertedId: undefined
        });
    } catch (err) {
        reject(err);
    }
}

/**
 *
 * @param model
 * @returns 
 * @private
 */
async function _delete<TData extends ModelData>(model: Model<TData>): Promise<void> {
    if (!model.data._id) {
        return;
    }
    if (!model.orm.db) throw new ExtError("ERR_DB_NOT_CONNECTED", "Database not connected in ORM.");
    try {
        if(model.orm.cache && model.data._id) await model.orm.cache.delete(model.name, model.data._id.toString());
        const collection: MongoDBCollection<TData> = model.orm.db.collection<TData>(model.name);
        await collection.deleteOne({ _id: model.data._id } as Filter<TData>);
        try {
            if(model.orm.cache && model.data._id) await model.orm.cache.delete(model.name, model.data._id.toString());
        } catch (e) {
            // ignore
        }
        // Nullify properties to make the instance unusable
        (model as any).orm = null; 
        (model as any).name = null;
        (model as any).schema = null;
        (model as any).data = null;
        (model as any).overwrite = null;
        (model as any)._set = null;
        (model as any)._hydrated = null;
    } catch (err) {
        throw err;
    }
}

/**
 *
 * @param model
 * @param options
 * @returns 
 * @private
 */
function _get<TModel extends Model<any>>(modelInstance: TModel, options?: GetOptions): Partial<TModel['data']> {
    options = options || { dry: false, key: "data", properties: null };
    const keyToUse = options.key && (options.key === "_set" || options.key === "data") ? options.key : "data";
    const source = modelInstance[keyToUse] as any; 
    const properties: Partial<TModel['data']> = {};

    if (source && source._id && !modelInstance.schema.properties.hasOwnProperty("_id")) {
        (properties as any)._id = typeof source._id === 'string' ? new ObjectId(source._id) : source._id;
    }

    const keysToProcess = options.properties || Object.keys(modelInstance.schema.properties);

    keysToProcess.forEach((propertyKey: string) => {
        const propertySchema = modelInstance.schema.properties[propertyKey];
        if (!propertySchema) return;

        const type = propertySchema.type;
        if ((types as any)[type] && typeof (types as any)[type].get === 'function') {
            const value = (types as any)[type].get(source, propertySchema, propertyKey, propertyKey, options!.dry);
            if (value !== null && value !== undefined) {
                (properties as any)[propertyKey] = value;
            }
        } else if (type in modelInstance.orm.schemas) {
            if (options!.dry && source?.[propertyKey] instanceof Model) {
                (properties as any)[propertyKey] = (source[propertyKey] as Model<any>).get({ dry: true });
            } else if (source?.[propertyKey] !== null && source?.[propertyKey] !== undefined) {
                (properties as any)[propertyKey] = source[propertyKey];
            }
        } else if ((types as any)[type]) { 
             if (options!.dry && source?.[propertyKey] !== null && source?.[propertyKey] !== undefined) {
                (properties as any)[propertyKey] = source[propertyKey];
            } else if (!options!.dry && source?.[propertyKey] !== null && source?.[propertyKey] !== undefined){
                 (properties as any)[propertyKey] = source[propertyKey]; 
            }
        } else {
            throw new ExtError("ERR_WRONG_PROPERTY_TYPE", `Type handler for '${type}' not found or get method missing for property '${propertyKey}'.`);
        }
    });
    return properties;
}

/**
 *
 * @param model
 * @param properties
 * @param merge
 * @returns 
 * @private
 */
async function _set<TModel extends Model<any>>(
    modelInstance: TModel, 
    properties: Partial<TModel['data']>, 
    merge?: boolean
): Promise<TModel> {
    if (!merge) {
        modelInstance.overwrite = true;
        modelInstance.data = { _id: modelInstance.data._id } as TModel['data']; 
    }
    await modelInstance.hydrate(); 

    const awaitPromises: Promise<any>[] = [];
    Object.entries(properties).forEach(([targetKey, itemValue]) => {
        if (targetKey === "_id" && !modelInstance.schema.properties.hasOwnProperty("_id")) {
            if (modelInstance.data._id && !modelInstance.overwrite) { 
                throw new ExtError("ERR_CANT_OVERWRITE_ID", "Can't overwrite model '_id' unless in full overwrite mode and _id is not yet set.");
            }
             if (modelInstance.overwrite || !modelInstance.data._id) { 
                let finalId: ObjectId | string;
                if (typeof itemValue === "string") {
                    try {
                        finalId = new ObjectId(itemValue);
                    } catch (e) {
                        if(modelInstance.schema.properties._id && modelInstance.schema.properties._id.type === 'String') {
                            finalId = itemValue;
                        } else {
                            throw new ExtError("ERR_ID_MUST_BE_OBJECTID_STRING", `Value of '_id' must be a valid ObjectId string, got '${itemValue}'`);
                        }
                    }
                } else if (itemValue instanceof ObjectId) {
                    finalId = itemValue;
                } else {
                    throw new ExtError("ERR_ID_MUST_BE_OBJECTID", `Value of '_id' must be instance of ObjectId or string, got ${typeof itemValue}`);
                }
                (modelInstance.data as any)[targetKey] = finalId;
                modelInstance._set[targetKey] = finalId;
                return;
            }
        }
        if (!modelInstance.schema.properties[targetKey]) {
            throw new ExtError("ERR_PROPERTY_NOT_ALLOWED", `Property '${targetKey}' not allowed in model '${modelInstance.name}'`);
        }
        const propertySchema = modelInstance.schema.properties[targetKey];
        const type = propertySchema.type;

        if ((types as any)[type] && typeof (types as any)[type].set === 'function') {
            const promise = (types as any)[type].set(modelInstance, modelInstance.data, modelInstance._set, propertySchema, targetKey, targetKey, itemValue);
            if (promise && typeof promise.then === 'function') {
                awaitPromises.push(promise);
            }
        } else if (type in modelInstance.orm.schemas) { 
            if (common.isPlainObject(itemValue)) {
                const itemData = Object.assign({}, itemValue as Record<string, any>);
                const _id = itemData._id;
                delete itemData._id;
                if (_id) {
                    awaitPromises.push(
                        modelInstance.orm.get(type, _id).then(async (nested: Model<any> | null) => {
                            if (!nested) throw new ExtError("ERR_NESTED_MODEL_NOT_FOUND", `Nested model ${type} with id ${_id} not found.`);
                            (modelInstance.data as any)[targetKey] = nested;
                            modelInstance._set[targetKey] = nested;
                            await nested.merge(itemData);
                        })
                    );
                } else {
                    const newItem = new Model(modelInstance.orm, type);
                    awaitPromises.push(newItem.set(itemData).then(() => {
                        (modelInstance.data as any)[targetKey] = newItem;
                        modelInstance._set[targetKey] = newItem;
                    }));
                }
            } else if (itemValue instanceof Model) {
                if (itemValue.name !== type) {
                    throw new ExtError("ERR_WRONG_MODEL_TYPE", `Expected value of '${targetKey}' to be instance of '${type}', got '${itemValue.name}'`);
                }
                (modelInstance.data as any)[targetKey] = itemValue;
                modelInstance._set[targetKey] = itemValue;
            } else {
                throw new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${targetKey}' to be a plain object or Model instance for schema type, got '${typeof itemValue}'`);
            }
        } else if ((types as any)[type]) { 
             (modelInstance.data as any)[targetKey] = itemValue;
             modelInstance._set[targetKey] = itemValue;
        } else {
            throw new ExtError("ERR_WRONG_PROPERTY_TYPE", `Type handler for '${type}' not found or set method missing for property '${targetKey}'.`);
        }
    });

    await Promise.all(awaitPromises);
    return modelInstance;
}

/**
 *
 * @param model
 * @param options
 * @returns 
 * @private
 */
async function _save_embedded<TData extends ModelData>(model: Model<TData>, options?: SaveOptions): Promise<void> {
	options = options || {key: "data"};
	const sourceKey = options.key === "_set" ? "_set" : "data";
	const source = model[sourceKey];
	const wait: Promise<any>[] = [];

	if(model.orm.schemas[model.name] && model.orm.schemas[model.name].dependencies){
		Object.entries(model.orm.schemas[model.name].dependencies).forEach(([_, paths]) => {
			Object.entries(paths).forEach(([path, embed]) => {
				common.pathMap(source as Record<string, any>, path, (embeddedItem) => { // Cast source
					_save_embedded_model(model, embeddedItem, wait);
				});
			});
		});
	}
	await Promise.all(wait);
}

/**
 *
 * @param model
 * @param embedded
 * @param wait
 * @private
 */
function _save_embedded_model<TData extends ModelData>(model: Model<TData>, embedded: any, wait: Promise<any>[]): void {
	if (embedded instanceof Model) {
		wait.push(embedded.save());
	}
}

/**
 *
 * @param model
 * @param names
 * @returns 
 * @private
 */
async function _hydrate<TData extends ModelData>(model: Model<TData>, names?: string[]): Promise<Model<TData>> {
	const wait: Promise<any>[] = [];
    const dependencies = model.orm.schemas[model.name]?.dependencies;
    if (!dependencies) return model;

	const hydrateNames = names || Object.keys(dependencies);
	hydrateNames.forEach((nameKey) => {
		const dependencyPaths = dependencies[nameKey];
		if (dependencyPaths && !model._hydrated.includes(nameKey)) {
			Object.entries(dependencyPaths).forEach(([path, embedOptions]) => { // embedOptions was 'embedded' in JS
				common.pathMap(model.data as Record<string, any>, path, (embeddedValue, currentKey, targetObject) => {
					if (Array.isArray(embeddedValue)) {
						embeddedValue.forEach((subEmbedded, subKey) => 
                            _hydrate_object(model, hydrateNames, targetObject[currentKey], subKey.toString(), nameKey, subEmbedded, wait)
                        );
					} else {
						_hydrate_object(model, hydrateNames, targetObject, currentKey, nameKey, embeddedValue, wait);
					}
				});
			});
		}
	});
	await Promise.all(wait);
	hydrateNames.forEach((nameKey) => common.pushUnique(model._hydrated, nameKey));
	return model;
}

/**
 *
 * @param model
 * @param names
 * @param target
 * @param key
 * @param name
 * @param embedded
 * @param wait
 * @private
 */
function _hydrate_object<TData extends ModelData>(
    model: Model<TData>, 
    names: string[] | undefined, // Can be undefined if hydrating all
    target: Record<string, any> | any[], // Can be an object or an array
    key: string, // key/index in target
    nameKey: string, // schema name to hydrate
    embeddedValue: any, // the value found at target[key]
    wait: Promise<any>[]
): void {
	if (!common.isPlainObject(embeddedValue) || !embeddedValue._id) {
		return;
	}
	wait.push(
        model.orm.get(nameKey, embeddedValue._id).then(async (hydratedDoc: Model<any> | null) => {
            if (!hydratedDoc) {
                return;
            }
            if (Array.isArray(target)) {
                 target[parseInt(key, 10)] = hydratedDoc;
            } else {
                target[key] = hydratedDoc;
            }
            await hydratedDoc.hydrate(names); // hydrate is async
        })
    );
}

/**
 *
 * @param model
 * @param options
 * @private
 */
function _dehydrate<TData extends ModelData>(model: Model<TData>, options?: SaveOptions): void {
	options = options || {key: "data"}; 
	const sourceKey = options.key === "_set" ? "_set" : "data";

    const dependencies = model.orm.schemas[model.name]?.dependencies;
    if(!dependencies) return;

	Object.values(dependencies).forEach((paths: any) => { // paths was 'dependencies' in JS
		Object.entries(paths).forEach(([path, embedOptions]: [string, any]) => { // embedOptions was 'dependency'
			common.pathMap(model[sourceKey] as Record<string, any>, path, (embeddedItem, currentKey, targetObject) => {
				_dehydrate_model(embeddedItem, currentKey, targetObject, embedOptions);
			});
		});
	});
	model._hydrated = [];
}

/**
 *
 * @param model
 * @param key
 * @param target
 * @param embed
 * @private
 */
function _dehydrate_model(embeddedItem: any, key: string, target: Record<string, any>, embedOptions: any[]): void {
	if (embeddedItem instanceof Model) {
		embeddedItem.dehydrate(); // dehydrate is sync
		const dataToEmbed = embeddedItem.get({dry: true});
		target[key] = _extractProperties(dataToEmbed, embedOptions); // embedOptions was 'embed'
		target[key]._id = dataToEmbed._id; // Ensure _id is always present
	}
}

/**
 *
 * @param object
 * @param properties
 * @returns 
 * @private
 */
function _extractProperties(object: Record<string, any>, properties: string[]): Record<string, any> {
	const result: Record<string, any> = {};
	const length = properties.length;
	for (let i = 0; i < length; i += 1) {
		result[properties[i]] = object[properties[i]];
	}
	return result;
}

// noinspection JSUnusedGlobalSymbols
// Assign private methods to a static property for testing or internal access, ensure 'Model' is correctly referenced
(Model as any)[Symbol.for("private")] = { 
    _dehydrate: _dehydrate as any, // Cast to any if signature mismatches due to Model<TData>
    _dehydrate_model: _dehydrate_model as any,
    _extractProperties: _extractProperties as any,
    _get: _get as any,
    _hydrate: _hydrate as any,
    _hydrate_object: _hydrate_object as any,
    _save_embedded: _save_embedded as any,
    _save_embedded_model: _save_embedded_model as any,
    _save_merge: _save_merge as any,
    _save_set: _save_set as any,
    _set: _set as any
};
