/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
import * as assert from "assert";
import { ObjectId, Db, Filter, FindOneAndUpdateOptions, UpdateFilter, FindOptions } from "mongodb";
import Sandstorm from "../index"; // Default export
import { Model } from "../src/model"; // Named export

// Define interfaces for model data for better type safety
interface BaseData {
    _id?: ObjectId | string;
    array?: any[];
    bool?: boolean;
    date?: Date;
    mix?: any;
    number?: number;
    object?: Record<string, any>;
    objId?: ObjectId;
    string?: string;
}

interface SubData {
    _id?: ObjectId;
    name: string;
    value?: string; // Made value optional as it's not always set in tests
}

interface FindOneData {
    _id?: ObjectId;
    key: string;
    value: string;
    sub?: SubData | Model<SubData>;
}

interface FindOneAndUpdateData {
    _id?: ObjectId;
    key: string;
    value: string;
    sub?: SubData | Model<SubData>;
}

interface GetData {
    _id?: ObjectId;
    key: string;
    value?: string;
}

interface StringIdData {
    _id: string;
    value: string;
}

interface CreateData {
    _id?: ObjectId;
    key: string;
    value?: string;
}


const orm = new Sandstorm();
orm.Schema.register("Base", {
    array: "Array",
    bool: "Boolean",
    date: "Date",
    mix: "Mixed",
    number: "Number",
    object: "Object",
    objId: "ObjectID",
    string: "String"
});

let _db: Db | null = null;

describe("Sandstorm", () => {
    after(async () => {
        await orm.disconnect();
    });

    before(async () => {
        await orm.connect("mongodb://root:root@localhost/admin");
        _db = await orm.use("sandstorm_test");
        if (_db) {
            await _db.dropDatabase();
        }
    });

    describe("findOne", () => {
        before(() => {
            orm.register("Sub", { name: "String" });
            orm.Schema.register("FindOne", {
                key: "String",
                value: "String",
                sub: "Sub"
            });
        });

        it("existing", async () => {
            const num = 10;
            const wait: Promise<any>[] = [];
            for (let a = 0; a < num; a++) {
                const model = orm.create<FindOneData>("FindOne");
                wait.push(model.set({
                    key: "key" + a,
                    value: "value" + a
                }).then((m) => m.save()));
            }
            await Promise.all(wait);

            const findPromises: Promise<Model<FindOneData> | null>[] = [];
            for (let a = 0; a < num; a++) {
                findPromises.push(orm.findOne<FindOneData>("FindOne", { key: "key" + a }));
            }
            const results = await Promise.all(findPromises);
            results.forEach((model, a) => {
                assert.ok(model, `Model key${a} should exist`);
                const result = model!.get(); // model is not null here
                delete result._id; // Remove _id for comparison
                assert.deepStrictEqual(result, {
                    key: "key" + a,
                    value: "value" + a
                });
            });
        });

        it("existing + hydrate", async () => {
            const num = 10;
            const wait: Promise<any>[] = [];
            const sub = orm.create<SubData>("Sub");
            await sub.set({ name: "sub" }); // Ensure sub is set before using it

            for (let a = 0; a < num; a++) {
                const model = orm.create<FindOneData>("FindOne");
                wait.push(model.set({
                    key: "skey" + a,
                    value: "value" + a,
                    sub: sub // Use the created sub model instance
                }).then(m => m.save()));
            }
            await Promise.all(wait);

            const findPromises: Promise<Model<FindOneData> | null>[] = [];
            for (let a = 0; a < num; a++) {
                findPromises.push(orm.findOne<FindOneData>("FindOne", { key: "skey" + a }, { hydrate: ["Sub"] }));
            }
            const results = await Promise.all(findPromises);
            results.forEach((model, a) => {
                assert.ok(model, `Model skey${a} should exist`);
                const result = model!.get();
                const subResult = (result.sub as Model<SubData>).get(); // Assuming sub is hydrated Model
                delete result._id;
                delete subResult._id;
                assert.deepStrictEqual(result, {
                    key: "skey" + a,
                    value: "value" + a,
                    sub: { name: "sub" }
                });
            });
        });

        it("not existing", async () => {
            const res = await orm.findOne<FindOneData>("FindOne", { key: "not existing" });
            assert.strictEqual(res, null);
        });
    });

    describe("findOneAndUpdate", () => {
        before(() => {
            // orm.register("Sub", {name: "String"}); // 'Sub' is already registered
            orm.Schema.register("FindOneAndUpdate", {
                key: "String",
                value: "String",
                sub: "Sub"
            });
        });

        it("existing", async () => {
            const num = 10;
            const wait: Promise<any>[] = [];
            for (let a = 0; a < num; a++) {
                const model = orm.create<FindOneAndUpdateData>("FindOneAndUpdate");
                wait.push(model.set({
                    key: "key" + a,
                    value: "value" + a
                }).then((m) => m.save()));
            }
            await Promise.all(wait);

            const updatePromises: Promise<Model<FindOneAndUpdateData> | null>[] = [];
            for (let a = 0; a < num; a++) {
                updatePromises.push(orm.findOneAndUpdate<FindOneAndUpdateData>("FindOneAndUpdate", { key: "key" + a }, { $set: { value: "value" + (a + 2) } }));
            }
            const results = await Promise.all(updatePromises);
            results.forEach((model, a) => {
                assert.ok(model, `Model key${a} after update should exist`);
                const result = model!.get();
                delete result._id;
                assert.deepStrictEqual(result, {
                    key: "key" + a,
                    value: "value" + (a + 2)
                });
            });
        });
        // Commented out tests are left as is, can be addressed in future iterations.
    });

    describe("get", () => {
        const idxs: (string | ObjectId)[] = []; // Type for idxs
        const fake_idxs: string[] = (new Array(10)).fill("123456789012345678901234");

        before(async () => {
            orm.Schema.register("Get", { key: "String", value: "String" });
            orm.Schema.register("StringId", { _id: "String", value: "String" });

            await Promise.all((new Array(10)).fill(0).map(async (_, idx) => {
                const model = await orm.create<GetData>("Get").set({ key: "" + idx });
                const { _id } = await model.save();
                if (_id) idxs.push(_id);
            }));
            
            const stringIdModel = await orm.create<StringIdData>("StringId").set({ _id: "ID", value: "VALUE" });
            await stringIdModel.save();
        });

        it("existing", async () => {
            const docs = await orm.get<GetData>("Get", idxs) as Model<GetData>[];
            assert.ok(Array.isArray(docs), "Result should be an array");
            docs.forEach((doc, idx) => {
                assert.ok(doc, `Doc with id ${idxs[idx]} should exist`);
                assert.strictEqual(doc.get()._id!.toString(), idxs[idx].toString());
            });
        });

        it("not existing", async () => {
            const docs = await orm.get<GetData>("Get", fake_idxs) as (Model<GetData> | null)[];
            assert.ok(Array.isArray(docs), "Result should be an array");
            docs.forEach(doc => assert.strictEqual(doc, null));
        });

        it("existing StringId", async () => {
            const doc = await orm.get<StringIdData>("StringId", "ID") as Model<StringIdData> | null;
            assert.ok(doc, "Doc with string ID 'ID' should exist");
            assert.deepStrictEqual(doc!.get(), {
                _id: "ID",
                value: "VALUE"
            });
        });
    });

    describe("create", () => {
        before(() => {
            orm.Schema.register("Create", { key: "String", value: "String" });
        });
        it("existing", () => {
            orm.create<CreateData>("Create");
        });
        it("not existing", () => {
            assert.throws(() => {
                orm.create("NotExisting");
            }, /ERR_MODEL_NOT_EXISTS/);
        });
        it("name not string", () => { // Corrected test name from "not existing"
            assert.throws(() => {
                orm.create(["NotString"] as any); // Cast to any to satisfy string type for test
            }, /ERR_MODEL_NAME_MUST_BE_STRING/);
        });
    });

    describe("autoincrement", () => {
        it("basic", async () => {
            assert.strictEqual(await orm.autoincrement("T1"), 1);
            assert.strictEqual(await orm.autoincrement("T2"), 1);
            assert.strictEqual(await orm.autoincrement("T2"), 2);
            assert.strictEqual(await orm.autoincrement("T1"), 2);
        });
    });
});

// Helper functions (should be typed as well, if they were more complex)
// For this file, only connection_cache_key is present. It's defined locally.
async function _ensure_indexes(db: Db | null, schemas: Record<string, SchemaDefinition>, options?: { overwrite?: boolean }): Promise<Db | null> {
    if (!db) return null; // Guard if db is null
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
                const fieldOrSpec = index.fieldOrSpec as IndexSpecification;
                const indexOptions = { ...(index.options || {}) } as CreateIndexesOptions;

                const schemaCollation = schemaDef.options.collation;
                if (schemaCollation && !common.isEmpty(schemaCollation) && !indexOptions.collation) {
                    indexOptions.collation = schemaCollation;
                }

                const createIndexOp = async () => {
                    try {
                        return await collection.createIndex(fieldOrSpec, common.isEmpty(indexOptions) ? undefined : indexOptions);
                    } catch (error: any) {
                        if (error.codeName === "IndexOptionsConflict" && options?.overwrite) {
                            try {
                                await collection.dropIndex(common.fieldOrSpecToName(fieldOrSpec));
                                return await collection.createIndex(fieldOrSpec, common.isEmpty(indexOptions) ? undefined : indexOptions);
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
