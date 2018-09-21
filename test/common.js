/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const common = require("../src/common");
describe("common", () => {
	it("pathMap", () => {
		const obj = {
			a: {
				b: {
					c: 42,
					d: ":("
				}
			}
		};
		let called = false;
		const path = "a.b.c";
		const cb = (item, key) => {
			called = true;
			assert(item === 42);
			assert(key === "c");
		};
		common.pathMap(obj, path, cb);
		assert(called);
	});
	it("pathMap", () => {
		const obj = {
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
		const path = "a.b.c";
		const cb = (item, key) => {
			called = true;
			assert(item === 42);
			assert(key === "c");
		};
		common.pathMap(obj, path, cb);
		assert(called);
	});
	it("pathMap", () => {
		const obj = {
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
		const path = "a.b.c";
		const cb = (item, key) => {
			called = true;
			assert(item === 42);
			assert(key === "c");
		};
		common.pathMap(obj, path, cb);
		assert(called);
	});
	it("pathMap", () => {
		const obj = {
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
		const path = "a.b.c";
		const cb = (item, key) => {
			called = true;
			assert(item === 42);
			assert(key === "c");
		};
		common.pathMap(obj, path, cb);
		assert(called);
	});
	const testObj = {
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
	const paths = {
		"array.item": 0,
		embed: "embed",
		"object.array": 0,
		"object.embed": "embed"
	};
	Object.keys(paths).forEach((path) => {
		it(path, () => {
			let called = false;
			const cb = (item, key, target) => {
				called = true;
				assert.strictEqual(item, "name");
				assert.strictEqual(key, paths[path]);
			};
			common.pathMap(testObj, path, cb);
			assert(called);
		});
	});
});
