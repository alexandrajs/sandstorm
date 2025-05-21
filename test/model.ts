"use strict";
/**
 * @ignore
 */
import * as assert from "assert";
import { ObjectId, Db, Filter, FindOneAndUpdateOptions, Collection } from "mongodb";
import Sandstorm from "../index"; // Default export
import { Model } from "../src/model"; // Named export
import { Cursor } from "../src/cursor"; // Named export

// Define interfaces for model data for better type safety
interface SetData {
    name: string;
    notExisting?: string; // For testing non-existing prop
    _id?: ObjectId | string;
}

interface ToJsonData {
    name: string;
    _id?: ObjectId | string;
}

interface BaseSchemaData {
    _id: string; // Explicitly string as per schema
    array: any[];
    bool: boolean;
    date: Date;
    mix: any;
    number: number;
    object: Record<string, any>;
    objId: ObjectId;
    string: string;
}

interface DeleteData {
    name: string;
    _id?: ObjectId;
}

interface EmbedData {
    name: string;
    value: string;
    _id?: ObjectId;
}

interface BaseEmbedData {
    _id?: ObjectId;
    array: { item: (EmbedData | Model<EmbedData>)[] }[];
    embed: EmbedData | Model<EmbedData>;
    object: {
        array: (EmbedData | Model<EmbedData>)[];
        embed: EmbedData | Model<EmbedData>;
    };
}

interface DeepMergeData {
    _id?: ObjectId;
    o: {
        a?: string;
        b: string;
        c: {
            o: {
                o: {
                    a?: string;
                    b: string;
                }
            }
        }
    }
}


describe("Model", () => {
    describe("set", () => {
        const orm = new Sandstorm();
        orm.register("Set", { name: "String" });
        it("not existing prop", async () => { // Changed to async to handle promise rejection
            const model = orm.create<SetData>("Set");
            try {
                await model.set({ notExisting: "key" });
                assert.fail("Exception expected for non-existing property");
            } catch (e: any) {
                assert.ok(e instanceof Error, "Should throw an error");
				assert.ok(e.message.includes("ERR_PROPERTY_NOT_ALLOWED"), "Error message should indicate property not allowed");
            }
        });
    });

    it("toJSON", () => {
        const orm = new Sandstorm();
        orm.register("ToJson", { name: "String" });
        const model = orm.create<ToJsonData>("ToJson");
        model.set({ name: "key" }); // set is async but not awaited here, which is fine if toJSON relies on synchronous state
        assert.strictEqual(model.toJSON(), model.data);
    });

    describe("base", () => {
        const orm = new Sandstorm();
        let _db: Db | null = null;

        before(async () => { // Changed to async
            orm.Schema.register("Base", {
                _id: "String", // schema defines _id as String
                array: "Array",
                bool: "Boolean",
                date: "Date",
                mix: "Mixed",
                number: "Number",
                object: "Object",
                objId: "ObjectID",
                string: "String"
            });
            await orm.connect("mongodb://root:root@localhost/admin");
            _db = await orm.use("sandstorm_test_model_base");
            if (_db) {
                await _db.dropDatabase();
            }
        });

        after(async () => { // Changed to async
            await orm.disconnect();
        });

        it("set + merge", async function () { // Changed to async
            const model = orm.create<BaseSchemaData>("Base");
            const date = new Date();
            const objId = new ObjectId();
            await model.set({ // set is async
                _id: "Klucz",
                array: [1, "a", false, { a: 2 }],
                bool: true,
                date: date,
                mix: "Mixed",
                number: 1.23,
                object: { a: 1, b: true },
                objId: objId,
                string: "String"
            });
            await model.save(); // save is async

            const baseCollection = _db!.collection<BaseSchemaData>("Base"); // Added type argument
            let _doc = await baseCollection.findOne({ _id: model.data._id as string });
            assert.deepStrictEqual(_doc, {
                _id: model.data._id,
                array: [1, "a", false, { a: 2 }],
                bool: true,
                date: date,
                mix: "Mixed",
                number: 1.23,
                object: { a: 1, b: true },
                objId: objId,
                string: "String"
            });

            await model.set({ object: { b: false }, array: [1, "a", true] });
            await model.save();
            _doc = await baseCollection.findOne({ _id: model.data._id as string });
            assert.deepStrictEqual(_doc, {
                _id: "Klucz",
                object: { b: false },
                array: [1, "a", true]
            });

            await model.merge({ object: { c: 3 } });
            await model.save();
            _doc = await baseCollection.findOne({ _id: model.data._id as string });
            assert.deepStrictEqual(_doc, {
                _id: "Klucz",
                object: { b: false, c: 3 },
                array: [1, "a", true]
            });

            const cursor = orm.find<BaseSchemaData>("Base", {});
            // Refactored from cursor.count()
            assert.strictEqual((await cursor.toArray()).length, 1); 
            let docArray = await cursor.toArray(); // Re-fetch if toArray consumes the cursor, or use the result from above.
            // For safety, assuming toArray() can be called multiple times or test logic implies it.
            // If cursor is consumed, this should be:
            // const docArrayForCount = await orm.find<BaseSchemaData>("Base", {}).toArray();
            // assert.strictEqual(docArrayForCount.length, 1);
            // let docArray = await orm.find<BaseSchemaData>("Base", {}).toArray(); // for further operations
            // For now, keeping it simple as the original test implies re-usability or small dataset.
            docArray = await cursor.toArray(); // Re-calling toArray for subsequent operations.
            const docFromCursor = docArray.pop() as Model<BaseSchemaData> | undefined;
            assert.ok(docFromCursor, "Document from cursor should exist");
            _doc = await baseCollection.findOne({ _id: docFromCursor.data._id as string });
            assert.deepStrictEqual(docFromCursor.data, _doc);
            assert.deepStrictEqual(docFromCursor.data, docFromCursor.get());
            await orm.get<BaseSchemaData>("Base", docFromCursor.data._id as string);
        });

        it("delete", async function () { // Changed to async
            orm.register("Delete", { name: "String" });
            const model = orm.create<DeleteData>("Delete", { name: "test" });
            let modelId: ObjectId | undefined;
            
            const savedModel = await model.save();
            modelId = savedModel._id as ObjectId; // Assuming save result has _id

            const deleteCollection = _db!.collection<DeleteData>("Delete");
            let _doc = await deleteCollection.findOne({ _id: modelId });
            assert.deepStrictEqual(_doc, { _id: modelId, name: "test" });
            
            await model.delete();
            _doc = await deleteCollection.findOne({ _id: modelId });
            assert.strictEqual(_doc, null);
        });
    });

    describe("embed", () => {
        let _db: Db | null = null;
        const orm = new Sandstorm();
        before(async () => { // Changed to async
            await orm.connect("mongodb://root:root@localhost/admin");
            _db = await orm.use("sandstorm_test_model_embed");
            if (_db) {
                await _db.dropDatabase();
            }
            orm.register("Embed", { name: "String", value: "String" });
            orm.Schema.register("BaseEmbed", { // Renamed to avoid conflict with 'Base' from previous describe
                array: [{ item: [{ type: "Embed", embed: ["name"] }] }],
                embed: { type: "Embed", embed: ["name"] },
                object: {
                    array: [{ type: "Embed", embed: ["name"] }],
                    embed: { type: "Embed", embed: ["name"] }
                }
            });
        });

        after(async () => { // Changed to async
            await orm.disconnect();
        });

        it("base set", async function () {
            const model = orm.create<BaseEmbedData>("BaseEmbed");
            await model.set({
                array: [{ item: [{ name: "in_array", value: "don't embed this" }] }],
                object: {
                    array: [{ name: "in_object_array", value: "don't embed this" }],
                    embed: { name: "in_object", value: "don't embed this" }
                },
                embed: { name: "in_root", value: "don't embed this" }
            });
            const savedModelData = await model.save();
            const baseEmbedCollection = _db!.collection<any>("BaseEmbed"); // Use 'any' for _doc if structure is complex
            let _doc = await baseEmbedCollection.findOne({ _id: savedModelData._id as ObjectId });

            assert.ok(_doc, "Document should exist after save");
            assert.ok(_doc.array instanceof Array);
            assert.strictEqual(_doc.array.length, 1);
            assert.ok(_doc.array[0].item.length === 1);
            assert.ok(_doc.array[0].item[0]._id instanceof ObjectId);
            assert.strictEqual(_doc.array[0].item[0].name, "in_array");
            assert.ok(_doc.object.array instanceof Array);
            assert.strictEqual(_doc.object.array.length, 1);
            assert.ok(_doc.object.array[0]._id instanceof ObjectId);
            assert.strictEqual(_doc.object.array[0].name, "in_object_array");
            assert.ok(_doc.object.embed._id instanceof ObjectId);
            assert.strictEqual(_doc.object.embed.name, "in_object");
            assert.ok(_doc.embed._id instanceof ObjectId);
            assert.strictEqual(_doc.embed.name, "in_root");

            const embed = await orm.get<EmbedData>("Embed", _doc.object.array[0]._id as ObjectId) as Model<EmbedData>;
            assert.ok(embed, "Embedded model should be retrievable");
            await embed.merge({ name: "updated" });
            await embed.save();
        });

        it("base merge", async function () {
            const _embed = orm.create<EmbedData>("Embed");
            await _embed.set({ name: "in_root", value: "don't embed this" });
            await _embed.save();

            const _embed_in_oa = orm.create<EmbedData>("Embed");
            await _embed_in_oa.merge({ name: "in_object_array", value: "don't embed this" });
            // Note: _embed_in_oa is not saved here in original test, if it's intended to be an existing doc, it should be saved.
            // If it's new, it will be saved when BaseEmbed model is saved.

            const model = orm.create<BaseEmbedData>("BaseEmbed");
            await model.merge({
                array: [{ item: [{ name: "in_array", value: "don't embed this" }] }],
                object: {
                    array: [_embed_in_oa], // This will embed the model instance
                    embed: { name: "in_object", value: "don't embed this" }
                },
                embed: _embed // This will embed the model instance
            });
            const savedModelData = await model.save();
            const baseEmbedCollection = _db!.collection<any>("BaseEmbed");
            let _doc = await baseEmbedCollection.findOne({ _id: savedModelData._id as ObjectId });
            
            assert.ok(_doc, "Document should exist after save");
            assert.ok(_doc.array instanceof Array && _doc.array.length === 1 && _doc.array[0].item.length === 1);
            assert.ok(_doc.array[0].item[0]._id instanceof ObjectId, "Nested item _id should be ObjectId");
            assert.strictEqual(_doc.array[0].item[0].name, "in_array");

            assert.ok(_doc.object.array instanceof Array && _doc.object.array.length === 1);
            assert.ok(_doc.object.array[0]._id instanceof ObjectId, "Object array item _id should be ObjectId");
            assert.strictEqual(_doc.object.array[0].name, "in_object_array");

            assert.ok(_doc.object.embed._id instanceof ObjectId, "Object embed _id should be ObjectId");
            assert.strictEqual(_doc.object.embed.name, "in_object");

            assert.ok(_doc.embed._id instanceof ObjectId, "Root embed _id should be ObjectId");
            assert.strictEqual(_doc.embed.name, "in_root");

            const embedToUpdate = await orm.get<EmbedData>("Embed", _doc.object.array[0]._id as ObjectId) as Model<EmbedData>;
            assert.ok(embedToUpdate, "Embed to update should exist");
            await embedToUpdate.merge({ name: "updated" });
            await embedToUpdate.save();
            
            await model.merge({ embed: { name: "embed updated" } as any }); // Cast to any if type conflict
            await model.save();
             _doc = await baseEmbedCollection.findOne({ _id: savedModelData._id as ObjectId });
             assert.strictEqual(_doc?.embed.name, "embed updated");
        });

        it("deep merge", async function () {
            orm.register("DeepMerge", {
                o: {
                    a: "String",
                    b: { type: "String", required: true },
                    c: { o: { o: { a: "String", b: { type: "String", required: true } } } }
                }
            });
            let model = orm.create<DeepMergeData>("DeepMerge");
            await model.set({
                o: { b: "b", c: { o: { o: { b: "b" } } } }
            });
            const { _id } = await model.save();
            // console.log(_id); // Original console.log removed for automated testing
            assert.ok(_id, "Saved model should have an _id");

            model = await orm.get<DeepMergeData>("DeepMerge", _id as ObjectId) as Model<DeepMergeData>;
            assert.ok(model, "Model should be retrievable by _id");
            await model.merge({
                o: { a: "a", c: { o: { o: { a: "a" } } } }
            });
            await model.save();

            const finalDoc = await _db!.collection("DeepMerge").findOne({_id: _id as ObjectId});
            assert.ok(finalDoc, "Final document should exist");
            assert.strictEqual(finalDoc!.o.a, "a");
            assert.strictEqual(finalDoc!.o.b, "b");
            assert.strictEqual(finalDoc!.o.c.o.o.a, "a");
            assert.strictEqual(finalDoc!.o.c.o.o.b, "b");
        });

        it("base set +", async function () { // The '+' in name might be problematic for some test runners
            const _embed = orm.create<EmbedData>("Embed");
            await _embed.set({ name: "embed", value: "don't embed this" });
            await _embed.save();

            const model = orm.create<BaseEmbedData>("BaseEmbed");
            await model.merge({ // Using merge, but test name says "set +"
                array: [{ item: [_embed, _embed] }],
                object: { array: [_embed], embed: _embed },
                embed: _embed
            });
            const savedModelData = await model.save();
            const baseEmbedCollection = _db!.collection<any>("BaseEmbed");
            let _doc = await baseEmbedCollection.findOne({ _id: savedModelData._id as ObjectId });

            assert.ok(_doc, "Document should exist");
            assert.ok(_doc.array instanceof Array && _doc.array.length === 1 && _doc.array[0].item.length === 2);
            assert.ok(_doc.array[0].item[0]._id instanceof ObjectId);
            assert.strictEqual(_doc.array[0].item[0].name, "embed");
            assert.ok(_doc.array[0].item[1]._id instanceof ObjectId);
            assert.strictEqual(_doc.array[0].item[1].name, "embed");

            assert.ok(_doc.object.array instanceof Array && _doc.object.array.length === 1);
            assert.ok(_doc.object.array[0]._id instanceof ObjectId);
            assert.strictEqual(_doc.object.array[0].name, "embed");

            assert.ok(_doc.object.embed._id instanceof ObjectId);
            assert.strictEqual(_doc.object.embed.name, "embed");

            assert.ok(_doc.embed._id instanceof ObjectId);
            assert.strictEqual(_doc.embed.name, "embed");

            const embedToUpdate = await orm.get<EmbedData>("Embed", _doc.object.array[0]._id as ObjectId) as Model<EmbedData>;
            assert.ok(embedToUpdate, "Embed to update should exist");
            await embedToUpdate.merge({ name: "updated" });
            await embedToUpdate.save();

            await model.merge({ embed: { name: "embed updated" } as any});
            await model.save();
             _doc = await baseEmbedCollection.findOne({ _id: savedModelData._id as ObjectId });
             assert.strictEqual(_doc?.embed.name, "embed updated");
        });
    });
});
