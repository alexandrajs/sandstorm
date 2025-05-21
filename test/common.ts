/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
import * as assert from "assert";
import * as common from "../src/common";

describe("common", () => {
    it("pathMap simple object", () => {
        const obj: Record<string, any> = {
            a: {
                b: {
                    c: 42,
                    d: ":("
                }
            }
        };
        let called = false;
        const path = "a.b.c";
        const cb = (item: any, key: string | number) => {
            called = true;
            assert.strictEqual(item, 42, "Item should be 42");
            assert.strictEqual(key, "c", "Key should be 'c'");
        };
        common.pathMap(obj, path, cb);
        assert.ok(called, "Callback should be called for simple object");
    });

    it("pathMap object in array", () => {
        const obj: Record<string, any> = {
            a: [
                {
                    b: {
                        c: 42,
                        d: ":("
                    }
                }
            ]
        };
        let called = false;
        const path = "a.b.c"; // This path targets 'c' inside the object within the array 'a'
        const cb = (item: any, key: string | number) => {
            called = true;
            assert.strictEqual(item, 42, "Item should be 42");
            assert.strictEqual(key, "c", "Key should be 'c'");
        };
        common.pathMap(obj, path, cb);
        assert.ok(called, "Callback should be called for object in array");
    });

    it("pathMap object in nested array", () => {
        const obj: Record<string, any> = {
            a: [
                [
                    {
                        b: {
                            c: 42,
                            d: ":("
                        }
                    }
                ]
            ]
        };
        let called = false;
        const path = "a.b.c"; // This path targets 'c' inside the object within the nested array 'a'
        const cb = (item: any, key: string | number) => {
            called = true;
            assert.strictEqual(item, 42, "Item should be 42");
            assert.strictEqual(key, "c", "Key should be 'c'");
        };
        common.pathMap(obj, path, cb);
        assert.ok(called, "Callback should be called for object in nested array");
    });

    it("pathMap object in array with nested array", () => {
        const obj: Record<string, any> = {
            a: [
                {
                    b: [
                        {
                            c: 42,
                            d: ":("
                        }
                    ]
                }
            ]
        };
        let called = false;
        const path = "a.b.c"; // This path targets 'c' inside the object within the array 'b'
        const cb = (item: any, key: string | number) => {
            called = true;
            assert.strictEqual(item, 42, "Item should be 42");
            assert.strictEqual(key, "c", "Key should be 'c'");
        };
        common.pathMap(obj, path, cb);
        assert.ok(called, "Callback should be called for object in array with nested array");
    });

    const testObj: Record<string, any> = {
        array: [
            {
                item: [
                    "name"
                ]
            }
        ],
        embed: "name",
        object: {
            array: [
                "name"
            ],
            embed: "name"
        }
    };

    const paths: Record<string, string | number> = { // Explicitly typed 'paths'
        "array.item": 0, // This indicates that the 'key' passed to cb for "array.item" should be 0
        "embed": "embed",
        "object.array": 0, // Similarly, key should be 0 for "object.array"
        "object.embed": "embed"
    };

    Object.keys(paths).forEach((path) => {
        it(`pathMap complex: ${path}`, () => {
            let called = false;
            const cb = (item: any, key: string | number, target: any) => {
                called = true;
                assert.strictEqual(item, "name", `Item for path '${path}' should be 'name'`);
                // The original test for 'key' was a bit confusing.
                // For "array.item", 'item' is "name", 'key' is 0 (index in innermost array), 'target' is ["name"]
                // For "embed", 'item' is "name", 'key' is "embed", 'target' is testObj
                // For "object.array", 'item' is "name", 'key' is 0, 'target' is ["name"]
                // For "object.embed", 'item' is "name", 'key' is "embed", 'target' is testObj.object
                // The value paths[path] seems to refer to the expected final key/index where 'name' is found.
                // Let's adjust the assertion to be more direct based on what pathMap provides.
                if(path === "array.item") assert.strictEqual(key, 0, `Key for path '${path}' should be 0`);
                else if(path === "object.array") assert.strictEqual(key, 0, `Key for path '${path}' should be 0`);
                else assert.strictEqual(key, paths[path], `Key for path '${path}' should be '${paths[path]}'`);

            };
            common.pathMap(testObj, path, cb);
            assert.ok(called, `Callback should be called for path '${path}'`);
        });
    });
});
