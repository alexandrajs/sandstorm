"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const Orm = require("../");
describe("types", () => {
	describe("set get", () => {
		describe("valid", () => {
			[
				{
					schema: {type: "String"},
					value: "value",
					name: "basic"
				},
				{
					schema: {type: "String"},
					value: new String("value"),
					expected: "value",
					name: "string object"
				},
				{
					schema: {
						type: "String",
						length: 5
					},
					value: "value",
					name: "with length"
				},
				{
					schema: {
						type: "String",
						min: 1
					},
					value: "value",
					name: "with min"
				},
				{
					schema: {
						type: "String",
						max: 5
					},
					value: "value",
					name: "with max"
				},
				{
					schema: {
						type: "String",
						pattern: /^[a-z]{5}$/
					},
					value: "value",
					name: "with pattern"
				},
				{
					schema: {
						type: "String",
						default: "value",
						required: true
					},
					expected: "value",
					name: "default value"
				}
			].forEach((test) => {
				it(test.schema.type + " " + test.name, () => {
					const orm = new Orm();
					orm.Schema.register("test", {key: test.schema});
					const model = orm.create("test");
					if ("value" in test) {
						model.set({key: test.value});
					}
					assert.strictEqual(model.get().key, test.expected || test.value);
				});
			});
		});
		describe("invalid", () => {
			[
				{
					schema: {type: "String"},
					value: true,
					name: "basic"
				},
				{
					schema: {
						type: "String",
						length: 5
					},
					value: "valu",
					name: "with length"
				},
				{
					schema: {
						type: "String",
						min: 1
					},
					value: "",
					name: "with min"
				},
				{
					schema: {
						type: "String",
						max: 5
					},
					value: " value",
					name: "with max"
				},
				{
					schema: {
						type: "String",
						pattern: /^[a-z]{5}$/
					},
					value: "value 123",
					name: "with pattern"
				},
				{
					schema: {
						type: "String",
						required: true
					},
					expected: "value",
					name: "missing required"
				}
			].forEach((test) => {
				it(test.schema.type + " " + test.name, () => {
					const orm = new Orm();
					orm.Schema.register("test", {key: test.schema});
					const model = orm.create("test");
					assert.throws(() => {
						if ("value" in test) {
							model.set({key: test.value});
						}
						model.get();
					});
				});
			});
		});
	});
});
