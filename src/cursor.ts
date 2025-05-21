/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as common from "./common";
import ExtError from "exterror";
import { FindCursor, Document as MongoDocument, Sort, CollationOptions, WithId } from "mongodb"; 
import { Model, ModelData } from "./model"; 
import { Sandstorm } from "./sandstorm";


export interface CursorOptions {
    hydrate?: string[];
    raw?: boolean;
    collation?: CollationOptions; 
    [key: string]: any; 
}

/**
 * @constructor
 */
// TRawDoc must extend WithId<MongoDocument> because MongoDB cursors always return documents with an _id.
export class Cursor<TModelData extends ModelData = ModelData, TRawDoc extends WithId<MongoDocument> = WithId<MongoDocument>> {
    public cursor: FindCursor<TRawDoc>; 
    public orm: Sandstorm; 
    public name: string; 
    public options: CursorOptions;

    constructor(cursor: FindCursor<TRawDoc>, orm: Sandstorm, name: string, options?: CursorOptions) {
        this.cursor = cursor;
        this.orm = orm;
        this.name = name;
        
        const schemaOptionsFromOrm = orm.schemas[name]?.options || {};
        
        // Carefully construct options, ensuring collation is compatible
        const initialOptions: CursorOptions = {
            hydrate: [],
            raw: false,
            ...schemaOptionsFromOrm, // This might bring a non-compatible collation
            ...(options || {})
        };

        // Explicitly handle collation to ensure type safety
        if (initialOptions.collation && typeof initialOptions.collation === 'object') {
            // Basic check for locale, can be more thorough if needed
            if (typeof (initialOptions.collation as CollationOptions).locale === 'string') {
                this.options = initialOptions;
                if (this.cursor.collation) { // Check if cursor has collation method
                     this.cursor.collation(this.options.collation as CollationOptions);
                }
            } else {
                // Collation from schema is not compatible, remove it or throw error
                console.warn(`Warning: Collation from schema for '${name}' is not compatible. Ignoring.`);
                const { collation, ...restOptions } = initialOptions;
                this.options = restOptions;
            }
        } else {
            this.options = initialOptions;
        }
    }

    /**
     *
     * @param options
     */
    setOptions(options?: CursorOptions): void {
        Object.assign(this.options, options || {});
    }

    /**
     *
     * @param options
     * @returns
     */
    async toArray(options?: CursorOptions): Promise<(Model<TModelData> | TRawDoc)[]> {
        this.setOptions(options);
        const docs = await this.cursor.toArray();
        if (this.options.raw && (!this.options.hydrate || !this.options.hydrate.length)) {
            return docs as TRawDoc[];
        }
        
        const models: Model<TModelData>[] = await Promise.all(docs.map(async (doc) => 
            common.docToModel(this.orm, this.name, doc as Record<string, any>) as Promise<Model<TModelData>>
        ));

        if (this.options.hydrate && this.options.hydrate.length > 0) {
             const hydratedModels = await Promise.all(models.map((model) => model.hydrate(this.options.hydrate!)));
             return hydratedModels;
        }
        return models;
    }

    /* istanbul ignore next */
    /**
     *
     * @param options
     */
    stream(options?: any): import("stream").Readable { // Return native cursor stream (Readable)
        // TODO: wrap in a custom stream that yields Models if not raw
        return this.cursor.stream(options); 
    }

    /**
     *
     * @param callback
     * @param options
     * @returns
     */
    async map<U>(callback: (modelOrDoc: Model<TModelData> | TRawDoc | null) => Promise<U> | U, options?: CursorOptions): Promise<U[]> {
        this.setOptions(options);
        const result: U[] = [];
        let modelOrDoc: Model<TModelData> | TRawDoc | null;
        while ((modelOrDoc = await this.next(options)) !== null) { // Pass options to next
            result.push(await callback(modelOrDoc));
        }
        return result;
    }

    /**
     *
     * @param callback
     * @param options
     * @returns
     */
    async filter(callback: (modelOrDoc: Model<TModelData> | TRawDoc | null) => Promise<boolean> | boolean, options?: CursorOptions): Promise<(Model<TModelData> | TRawDoc)[]> {
        this.setOptions(options);
        const result: (Model<TModelData> | TRawDoc)[] = [];
        let modelOrDoc: Model<TModelData> | TRawDoc | null;
        while ((modelOrDoc = await this.next(options)) !== null) { // Pass options to next
            if (await callback(modelOrDoc)) {
                result.push(modelOrDoc);
            }
        }
        return result;
    }

    /**
     *
     * @param callback
     * @param options
     * @returns
     */
    async forEach(callback: (modelOrDoc: Model<TModelData> | TRawDoc | null) => Promise<void> | void, options?: CursorOptions): Promise<void> {
        this.setOptions(options);
        let modelOrDoc: Model<TModelData> | TRawDoc | null;
        while ((modelOrDoc = await this.next(options)) !== null) { // Pass options to next
            await callback(modelOrDoc);
        }
    }

    /**
     *
     * @returns
     */
    async next(options?: CursorOptions): Promise<Model<TModelData> | TRawDoc | null> {
        this.setOptions(options); 
        const doc = await this.cursor.next();
        if (!doc) {
            return null;
        }
        if (this.options.raw && (!this.options.hydrate || !this.options.hydrate.length)) {
            return doc as TRawDoc;
        }
        // Assuming docToModel is async and correctly typed
        const model = await common.docToModel(this.orm, this.name, doc as Record<string, any>) as Model<TModelData>;
        if (this.options.hydrate && this.options.hydrate.length > 0) {
            return model.hydrate(this.options.hydrate); // model.hydrate returns Promise<Model<TModelData>>
        }
        return model;
    }

    /**
     *
     * @param value
     * @returns
     */
    project(value: MongoDocument): this { // Use MongoDocument
        this.cursor.project(value);
        return this;
    }

    /**
     *
     * @param collation
     * @returns
     */
    collation(collation: CollationOptions): this {
        this.cursor.collation(collation);
        return this;
    }

    /**
     *
     * @param value
     * @returns
     */
    limit(value: number): this {
        this.cursor.limit(value);
        return this;
    }

    /**
     *
     * @param keyOrList
     * @param direction
     * @returns
     */
    sort(keyOrList: Sort | string, direction?: 'asc' | 'desc' | 1 | -1): this {
        this.cursor.sort(keyOrList, direction as any); // Cast direction as any to satisfy SortDirection
        return this;
    }

    /**
     *
     * @param value
     * @returns
     */
    skip(value: number): this {
        this.cursor.skip(value);
        return this;
    }

    /**
     *
     * @param applySkipLimit
     * @param options
     * @returns
     */
    async count(applySkipLimit?: boolean, options?: any): Promise<number> {
        // NOTE: cursor.count() is deprecated and removed in MongoDB driver v4.0+.
        // The original cursor.count() could take options and applySkipLimit.
        // A direct replacement with toArray().length might not respect these if the native
        // count method was doing more (e.g. server-side count with query).
        // For a simple count of documents the cursor would iterate over:
        if (applySkipLimit || options) {
            // This indicates the original test might have expected server-side counting with these options.
            // A true replacement would be this.orm.db.collection(this.name).countDocuments(this.cursor.filter, options)
            // but this.cursor.filter is the query document, and this.cursor.options may contain skip/limit.
            // This is complex to replicate perfectly here without changing Sandstorm.find significantly.
            // For now, this will count client-side after applying skip/limit already set on cursor.
            console.warn("Cursor.count() called with applySkipLimit or options. This behavior is approximated by client-side counting after toArray(). For accurate server-side counts with options, refactor to use collection.countDocuments().");
        }
        // Clone the cursor to avoid consuming the original one if toArray() is called later.
        const allDocs = await this.cursor.clone().toArray();
        return allDocs.length;
    }

    /**
     *
     * @param names
     * @returns
     */
    hydrate(names: string[]): this {
        if (!Array.isArray(names)) {
            throw new ExtError("ERR_PARAM_NAMES_MUST_BE_ARRAY", "Parameter 'names' must be an array");
        }
        this.options.hydrate = names;
        return this;
    }
}

// module.exports = Cursor; // Replaced by export class Cursor
