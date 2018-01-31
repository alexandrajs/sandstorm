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
			a: [
				{
					b: {
						c: 42,
						d: ":("
					}
				}
			]
		};
		const path = "a.b.c";
		const cb = (item, key) => {
			assert(item === 42);
			assert(key === "c");
		};
		common.pathMap(obj, path, cb);
	});
});