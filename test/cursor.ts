/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
import * as assert from "assert";
import { ObjectId, MongoClient, Db, SortDirection } from "mongodb"; // MongoClient & Db added for type safety
import Sandstorm from "../index"; // Assuming Sandstorm is default export from index.ts
import { Model } from "../src/model"; // Assuming Model is a named export
import { Cursor } from "../src/cursor"; // Assuming Cursor is a named export

const orm = new Sandstorm();

// Define interfaces for model data for better type safety
interface SubData {
    name: string;
    value: string;
    _id?: ObjectId; // Sub-documents might get an _id from MongoDB
}

interface BaseData {
    id: number;
    array: SubData[];
    _id?: ObjectId;
}

interface CollatedData {
    name: string;
    array: SubData[];
    _id?: ObjectId;
}

orm.register("Sub", {
    name: "String",
    value: "String"
});
orm.Schema.register("Base", { // Assuming Schema is accessed like this, or directly: new Schema(orm)
    id: "Number",
    array: [
        {
            type: "Sub",
            embed: ["name"]
        }
    ]
});
orm.Schema.register("Collated", {
    name: "String",
    array: [
        {
            type: "Sub",
            embed: ["name"]
        }
    ]
});

let _db: Db | null = null;

describe("Cursor", () => {
    after(async () => {
        await orm.disconnect();
    });

    before(async () => { // Changed to async function
        await orm.connect("mongodb://root:root@localhost/admin");
        _db = await orm.use("sandstorm_test_cursor");
        if (_db) {
            await _db.dropDatabase();
        }

        const num = 10;
        const wait: Promise<any>[] = [];
        for (let a = 0; a < num; a++) {
            const model = orm.create<BaseData>("Base");
            wait.push(model.set({
                id: a,
                array: [
                    {
                        name: "One" + a,
                        value: "" + a
                    },
                    {
                        name: "Two" + a,
                        value: "" + a
                    }
                ]
            }).then(m => m.save()));
        }
        const colNames = "abc,żółw,Blah,Ćma,ćpa,coś,Alfabet,alfabet,123,lepa".split(",");
        for (let a = 0; a < num; a++) {
            const model = orm.create<CollatedData>("Collated");
            wait.push(model.set({
                name: colNames[a],
                array: [
                    {
                        name: colNames[a] + "One" + a,
                        value: "" + a
                    },
                    {
                        name: "Two" + a,
                        value: colNames[a]
                    }
                ]
            }).then(m => m.save()));
        }
        await Promise.all(wait);
    });

    describe("toArray", () => {
        it("project", async () => {
            const results = await orm.find<BaseData>("Base", {"array.name": "One5"}).project({array: 0}).toArray();
            const model = results.pop() as Model<BaseData> | undefined; // Ensure results can be Model or raw doc
            assert.ok(model, "Model should exist");
            const doc = model.get();
            assert.strictEqual(doc.id, 5);
            assert.strictEqual(typeof doc.array, "undefined");
        });

        it("hydrate", async () => {
            const results = await orm.find<BaseData>("Base", {"array.name": "One5"}).hydrate(["Sub"]).toArray();
            const model = results.pop() as Model<BaseData> | undefined;
            assert.ok(model, "Model should exist");
            const baseDoc = model.get();
            const subs = baseDoc.array.map((subModel: Model<SubData>) => subModel.get());
            subs.forEach(subDoc => assert.strictEqual(subDoc.value, "5"));
        });

        it("skip + hydrate", async () => {
            const results = await orm.find<BaseData>("Base", {}).skip(5).hydrate(["Sub"]).toArray();
            assert.strictEqual(results.length, 5);
        });

        it("limit + hydrate", async () => {
            const results = await orm.find<BaseData>("Base", {}).limit(5).hydrate(["Sub"]).toArray();
            assert.strictEqual(results.length, 5);
        });

        it("sort asc + hydrate", async () => {
            const results = await orm.find<BaseData>("Base", {}).sort({"array.name": 1 as SortDirection}).limit(2).hydrate(["Sub"]).toArray() as Model<BaseData>[];
            assert.strictEqual(results.length, 2);
            const dry = results.map(model => model.get());
            assert.strictEqual(dry[0].array[0].get().name, "One0");
            assert.strictEqual(dry[1].array[0].get().name, "One1");
        });

        it("sort desc + hydrate", async () => {
            const results = await orm.find<BaseData>("Base", {}).sort({"array.name": -1 as SortDirection}).limit(2).hydrate(["Sub"]).toArray() as Model<BaseData>[];
            assert.strictEqual(results.length, 2);
            const dry = results.map(model => model.get());
            assert.strictEqual(dry[0].array[0].get().name, "One9");
            assert.strictEqual(dry[1].array[0].get().name, "One8");
        });

        it("sort desc + collation", async () => {
            const results = await orm.find<CollatedData>("Collated", {}).sort({"name": -1 as SortDirection}).collation({
                locale: "pl",
                strength: 3
            }).toArray() as Model<CollatedData>[];
            assert.strictEqual(results.map(model => model.get().name).join(","), "żółw,lepa,ćpa,Ćma,coś,Blah,Alfabet,alfabet,abc,123");
        });
    });

    describe("filter", () => {
        it("limit", async () => {
            const cursor = orm.find<BaseData>("Base", {}).sort({"array.name": -1 as SortDirection}).limit(3);
            const results = await cursor.filter(async (m: Model<BaseData> | null) => m!.get().id !== 8) as Model<BaseData>[]; // Added type for m
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].get().id, 9);
            assert.strictEqual(results[1].get().id, 7);
            await assert.rejects(cursor.next());
        });
    });

    describe("forEach", () => {
        it("limit", async () => {
            const cursor = orm.find<BaseData>("Base", {}).sort({"array.name": -1 as SortDirection}).limit(2);
            const results: number[] = [];
            await cursor.forEach(async (m: Model<BaseData> | null) => results.push(m!.get().id)); // Added type for m
            assert.deepStrictEqual(results, [9, 8]);
            await assert.rejects(cursor.next());
        });
    });

    describe("map", () => {
        it("limit", async () => {
            const cursor = orm.find<BaseData>("Base", {}).sort({"array.name": -1 as SortDirection}).limit(2).hydrate(["Sub"]);
            assert.deepStrictEqual(await cursor.map(async (m: Model<BaseData> | null) => m!.get().id), [9, 8]); // Added type for m
            await assert.rejects(cursor.next());
        });
    });

    describe("next", () => {
        it("limit + hydrate", async () => {
            const cursor = orm.find<BaseData>("Base", {}).limit(2);
            assert.ok(await cursor.next() !== null, "First next() should return a model");
            cursor.setOptions({raw: true});
            assert.ok(await cursor.next() !== null, "Second next() (raw) should return a doc");
            assert.strictEqual(await cursor.next(), null, "Third next() should be null (cursor exhausted)");
        });
    });
});
