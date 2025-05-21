/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import { Model } from "./model";
import { Schema, SchemaDefinition, Blueprint } from "./schema"; // Assuming SchemaDefinition and Blueprint are exported
import { Cursor } from "./cursor";
import * as common from "./common";
import { MongoClient, Db, Collection, FindOptions, Filter, UpdateFilter, FindOneAndUpdateOptions, ObjectId, Document, AggregationCursor, MongoClientOptions } from "mongodb";

// External Caching libraries - Assuming they are installed and have basic 'any' typings for now
// If typings are available, they should be installed and used.
declare const AMule: any; // Placeholder for AMule type
declare const Aim: any; // Placeholder for Aim type
declare const Rush: any; // Placeholder for Rush type
declare const More: any; // Placeholder for More type
import ExtError from "exterror";


interface CacheOptions {
    l0?: Record<string, any> | false;
    l1?: Record<string, any> | false;
    l2?: Record<string, any> & { enforceObjectID?: boolean };
}

export interface SandstormOptions {
    cache?: CacheOptions;
    // Add other ORM-level options if any
}

interface ConnectionCacheKeyArgs {
    connectionString?: string;
    _connectionString?: string;
    connectionOptions?: MongoClientOptions;
    _connectionOptions?: MongoClientOptions;
}

// Module-level caches, assuming they store MongoClient instances and AMule instances respectively
const __c_caches: Record<string, MongoClient> = {};
const __caches: Record<string, any> = {}; // Stores AMule instances

/**
 * @constructor
 */
export class Sandstorm {
    public options: SandstormOptions;
    public schemas: Record<string, SchemaDefinition>;
    public Schema: Schema; // Instance of Schema class for this ORM
    public db: Db | null;
    public client: MongoClient | null;
    public cache: any | null; // AMule instance
    private _connectionString: string;
    private _connectionOptions?: MongoClientOptions;

    constructor(options?: SandstormOptions) {
        this.options = {
            cache: {
                l0: {},
                l1: {},
                l2: { enforceObjectID: false }
            }
        };
        Object.assign(this.options, options || {});
        this.schemas = {};
        this.Schema = new Schema(this as any); // Pass this Sandstorm instance to Schema
        this.db = null;
        this.client = null;
        this.cache = null;
        this._connectionString = "";
        this._connectionOptions = undefined;
    }

    async connect(connectionString: string, connectionOptions?: MongoClientOptions): Promise<MongoClient> {
        this._connectionString = ""; // Resetting before assignment
        this._connectionOptions = undefined; // Resetting before assignment

        const cache_key_args: ConnectionCacheKeyArgs = { connectionString, connectionOptions };
        const cache_name = connection_cache_key(cache_key_args);

        if (cache_name in __c_caches) {
            this._connectionString = connectionString;
            this._connectionOptions = connectionOptions;
            this.client = __c_caches[cache_name];
            return this.client;
        }

        this.client = await MongoClient.connect(connectionString, connectionOptions || {});
        this._connectionString = connectionString;
        this._connectionOptions = connectionOptions;
        __c_caches[cache_name] = this.client;
        return this.client;
    }

    async use(dbName: string): Promise<Db | null> {
        if (!this.client) {
            throw new ExtError("ERR_CLIENT_NOT_CONNECTED", "MongoClient not connected. Call connect() first.");
        }
        this.db = this.client.db(dbName);
        this.cache = _init_cache(this, dbName); // this is Sandstorm instance
        try {
            await this.ensureIndexes();
        } catch (error: any) {
            console.error("Error during ensureIndexes in use():", error);
            // Original code returns this.db even if ensureIndexes fails, so we replicate that.
        }
        return this.db;
    }

    async ensureIndexes(options?: any): Promise<Db | null> { // options for ensureIndexes not well defined in original
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected. Call use() first.");
        }
        return _ensure_indexes(this.db, this.schemas, options);
    }

    async disconnect(): Promise<void> {
        const cache_key_args: ConnectionCacheKeyArgs = { 
            _connectionString: this._connectionString, 
            _connectionOptions: this._connectionOptions 
        };
        const cache_name = connection_cache_key(cache_key_args);
        delete __c_caches[cache_name]; // Remove client from shared cache

        // Clear caches associated with this Sandstorm instance
        // This part needs careful review based on how __caches is structured and used
        // For now, assuming it's safe to nullify this instance's cache
        if (this.cache) {
            // AMule specific disconnection logic might be needed if 'pop' isn't sufficient
            // or if clients within AMule need explicit closing.
            // The original code had: this.cache.pop(); this.cache.pop().client.disconnect();
            // This implies AMule has a stack-like structure and contains clients that need disconnect.
            // This is highly specific to AMule's implementation.
            // For now, we'll just nullify, assuming AMule handles its own cleanup or is simple.
            this.cache = null;
        }
        
        // Clear instance-specific caches derived from connection_cache_key + dbName
        // This requires iterating through __caches and removing relevant entries
        const prefixToClear = cache_name + "_";
        for (const key in __caches) {
            if (key.startsWith(prefixToClear)) {
                delete __caches[key];
            }
        }


        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }

    create<T extends Model = Model>(name: string, data?: Record<string, any>): T {
        if (typeof name !== "string") {
            throw new ExtError("ERR_MODEL_NAME_MUST_BE_STRING", `Expected parameter 'name' to be string, got ${typeof name}`);
        }
        if (!(name in this.schemas)) {
            throw new ExtError("ERR_MODEL_NOT_EXISTS", `Model '${name}' does not exist`);
        }
        // Assuming Model constructor takes (orm: Sandstorm, name: string, data: any)
        return new Model(this as any, name, data) as T;
    }

    find<TDoc extends Document = Document>(name: string, query: Filter<TDoc>, options?: FindOptions<TDoc>): Cursor<Model, TDoc> {
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected for find operation.");
        }
        const collection: Collection<TDoc> = this.db.collection<TDoc>(name);
        const schemaOptions = this.schemas[name]?.options || {};
        const findOptions = Object.assign({}, schemaOptions, options || {});
        // Assuming Cursor constructor takes (nativeCursor, ormInstance, modelName, cursorOptions)
        return new Cursor<Model, TDoc>(collection.find(query, findOptions), this as any, name, schemaOptions as any);
    }

    async findOne<TDoc extends Document = Document>(name: string, query: Filter<TDoc>, options?: FindOptions<TDoc> & { hydrate?: string[] }): Promise<Model | TDoc | null> {
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected for findOne operation.");
        }
        options = options || {};
        const { hydrate, ...query_options } = options; // query_options will be FindOptions<TDoc>
        const doc = await this.db.collection<TDoc>(name).findOne(query, query_options);
        if (!doc) {
            return null;
        }
        // Assuming common.docToModel returns a Promise<Model>
        const model = await common.docToModel(this as any, name, doc as Record<string, any>) as Model;
        if (hydrate && hydrate.length) {
            return model.hydrate(hydrate); // hydrate returns a Promise<Model>
        }
        return model;
    }

    async findOneAndUpdate<TDoc extends Document = Document>(name: string, filter: Filter<TDoc>, update: UpdateFilter<TDoc> | Partial<TDoc>, options?: FindOneAndUpdateOptions & { hydrate?: string[] }): Promise<Model | TDoc | null> {
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected for findOneAndUpdate operation.");
        }
        options = options || {};
        const { hydrate, ...query_options } = options;
        // Ensure returnDocument is 'after' for the new driver version
        const findOneAndUpdateOptions: FindOneAndUpdateOptions = { ...query_options, returnDocument: 'after' };

        const result = await this.db.collection<TDoc>(name).findOneAndUpdate(filter, update, findOneAndUpdateOptions);
        const doc = result.value;
        if (!doc) {
            return null;
        }
        const model = await common.docToModel(this as any, name, doc as Record<string, any>) as Model;
        if (hydrate && hydrate.length) {
            return model.hydrate(hydrate);
        }
        return model;
    }

    /* istanbul ignore next */
    aggregate<T extends Document = Document>(name: string, pipeline: Document[], options?: any): AggregationCursor<T> {
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected for aggregate operation.");
        }
        return this.db.collection(name).aggregate<T>(pipeline, options);
    }

    async get<T extends Model = Model>(name: string, ids: string | string[] | ObjectId | ObjectId[], options?: { swallowErrors?: boolean }): Promise<(T | null) | (T | null)[] | null> {
        options = Object.assign({ swallowErrors: false }, options || {});
        if (this.db === null) {
            return Promise.reject(new ExtError("ERR_ORM_NOT_CONNECTED", "Not connected"));
        }

        const getSingleModel = (id: string | ObjectId): Promise<T | null> => {
            return new Promise<T | null>((resolve, reject) => {
                common.getModel(this as any, name, id.toString(), (err: any, model: Model | null) => {
                    if (err) {
                        return options?.swallowErrors ? resolve(null) : reject(err);
                    }
                    resolve(model as T | null);
                });
            });
        };

        if (!Array.isArray(ids)) {
            return getSingleModel(ids);
        }

        const promises = ids.map(id => getSingleModel(id));
        return Promise.all(promises);
    }
    
    async autoincrement(name: string): Promise<number> {
        if (!this.db) {
            throw new ExtError("ERR_DB_NOT_SELECTED", "Database not selected for autoincrement operation.");
        }
        const result = await this.db.collection<{ _id: string, value: number }>("_autoincrement").findOneAndUpdate(
            { _id: name },
            { $inc: { value: 1 } },
            { upsert: true, returnDocument: 'after' }
        );
        if (!result.value) {
            throw new ExtError("ERR_AUTOINCREMENT_FAILED", `Autoincrement for '${name}' failed to return a value.`);
        }
        return result.value.value;
    }

    register(name: string, blueprint: Blueprint): SchemaDefinition {
        return this.Schema.register(name, blueprint);
    }
}

// Export Schema along with Sandstorm as default
export { Schema };
export default Sandstorm;


// Helper functions (should be typed as well)
function _init_cache(orm: Sandstorm, dbName: string): any { // Return type AMule or any
    if (!orm.db) { // Guard against orm.db being null
        throw new ExtError("ERR_DB_NOT_INITIALIZED_FOR_CACHE", "Database not initialized for cache setup.");
    }
    const cache_key_args: ConnectionCacheKeyArgs = { 
        _connectionString: (orm as any)._connectionString, // Accessing private members, consider refactor
        _connectionOptions: (orm as any)._connectionOptions
    };
    const cache_name = connection_cache_key(cache_key_args) + "_" + dbName;
    if (cache_name in __caches) {
        return __caches[cache_name];
    }
    const mule = new AMule(); // Assuming AMule can be instantiated like this
    if (orm.options.cache?.l0 !== false) {
        mule.use(new Aim(Object.assign({ cache: false }, orm.options.cache?.l0 || {})));
    }
    if (orm.options.cache?.l1 !== false) {
        mule.use(new Rush(Object.assign({ prefix: dbName + "_" }, orm.options.cache?.l1 || {})));
    }
    mule.use(new More(orm.db, Object.assign({}, orm.options.cache?.l2 || {})));
    __caches[cache_name] = mule;
    return mule;
}

async function _ensure_indexes(db: Db, schemas: Record<string, SchemaDefinition>, options?: { overwrite?: boolean }): Promise<Db> {
    options = Object.assign({ overwrite: true }, options || {});
    const allIndexPromises: Promise<string | undefined>[] = [];

    for (const [name, schemaDef] of Object.entries(schemas)) {
        const schemaIndexes = schemaDef.options.indexes;
        if (schemaIndexes) {
            const collection = db.collection(name);
            for (const index of schemaIndexes) {
                if (!common.isPlainObject(index)) {
                    throw new ExtError("ERR_COLLECTION_INDEX_MUST_BE_OBJECT", "Collection index must be plain object");
                }
                if (typeof index.fieldOrSpec !== "string" && !common.isPlainObject(index.fieldOrSpec)) {
                    throw new ExtError("ERR_COLLECTION_INDEX_FIELD_OR_SPEC_MUST_BE_OBJECT_OR_STRING", "Collection index.fieldOrSpec must be plain object or string");
                }

                const indexOptions = { ...index.options }; // Clone
                const schemaCollation = schemaDef.options.collation;
                if (schemaCollation && !common.isEmpty(schemaCollation) && !indexOptions.collation) {
                    indexOptions.collation = schemaCollation;
                }
                
                const createIndexOp = async () => {
                    try {
                        return await collection.createIndex(index.fieldOrSpec, common.isEmpty(indexOptions) ? undefined : indexOptions);
                    } catch (error: any) {
                        if (error.codeName === "IndexOptionsConflict" && options?.overwrite) {
                            try {
                                await collection.dropIndex(common.fieldOrSpecToName(index.fieldOrSpec));
                                return await collection.createIndex(index.fieldOrSpec, common.isEmpty(indexOptions) ? undefined : indexOptions);
                            } catch (retryError: any) {
                                throw new ExtError("ERR_MONGODB_INTERNAL_ERROR_RETRY", retryError.message);
                            }
                        } else {
                            throw new ExtError("ERR_MONGODB_INTERNAL_ERROR", error.message);
                        }
                    }
                };
                allIndexPromises.push(createIndexOp());
            }
        }
    }
    await Promise.all(allIndexPromises);
    return db;
}

function connection_cache_key(args: ConnectionCacheKeyArgs): string {
    const { connectionString, _connectionString, connectionOptions, _connectionOptions } = args;
    if (_connectionString) {
        return _connectionString + (_connectionOptions ? "_" + JSON.stringify(_connectionOptions) : "");
    }
    return (connectionString || "") + (connectionOptions ? "_" + JSON.stringify(connectionOptions) : "");
}
