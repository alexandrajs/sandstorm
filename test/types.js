"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const Orm = require("../");
describe("types", () => {
	describe("set get", () => {
		describe("valid", () => {
			describe("Array", () => {
				[
					{
						schema: {type: "Array"},
						value: [],
						name: "basic"
					},
					{
						schema: {type: "Array"},
						value: new Array(),
						expected: [],
						name: "string object"
					},
					{
						schema: {
							type: "Array",
							length: 5
						},
						value: [
							1,
							2,
							3,
							4,
							5
						],
						name: "with length"
					},
					{
						schema: {
							type: "Array",
							min: 1
						},
						value: [
							1,
							2
						],
						name: "with min"
					},
					{
						schema: {
							type: "Array",
							max: 5
						},
						value: [
							1,
							2
						],
						name: "with max"
					},
					{
						schema: {
							type: "Array",
							item: {
								name: "String",
								value: "String"
							}
						},
						value: [
							{
								name: "Name",
								value: "Value"
							}
						],
						name: "with max"
					},
					{
						schema: {
							type: "Array",
							item: "sub"
						},
						value: [
							{
								key: "Key"
							}
						],
						expected: {
							key: "Key"
						},
						is_model: true,
						name: "with max"
					},
					{
						schema: {
							type: "Array",
							item: "sub"
						},
						value: {
							key: "Key"
						},
						expected: {
							key: "Key"
						},
						is_model: true,
						from_model: true,
						name: "with max"
					},
					{
						schema: {
							type: "Array",
							default: [],
							required: true
						},
						expected: [],
						name: "default value"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: "String"});
						orm.Schema.register("test", {key: test.schema});
						const model = orm.create("test");
						if ("value" in test) {
							if (test.from_model) {
								const sub = orm.create("sub");
								sub.set(test.value);
								test.value = [sub];
							}
							model.set({key: test.value});
						}
						if (test.is_model) {
							assert.deepEqual(model.get().key[0].get(), test.expected || test.value);
						} else {
							assert.deepEqual(model.get().key, test.expected || test.value);
						}
					});
				});
			});
			describe("Boolean", () => {
				[
					{
						schema: {type: "Boolean"},
						value: false,
						name: "basic"
					},
					{
						schema: {type: "Boolean"},
						value: new Boolean(true),
						expected: true,
						name: "boolean object"
					},
					{
						schema: {
							type: "Boolean",
							default: true,
							required: true
						},
						expected: true,
						name: "default value"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: "String"});
						orm.Schema.register("test", {key: test.schema});
						const model = orm.create("test");
						if ("value" in test) {
							if (test.from_model) {
								const sub = orm.create("sub");
								sub.set(test.value);
								test.value = [sub];
							}
							model.set({key: test.value});
						}
						if (test.is_model) {
							assert.deepEqual(model.get().key[0].get(), test.expected || test.value);
						} else {
							assert.deepEqual(model.get().key, test.expected || test.value);
						}
					});
				});
			});
			describe("Date", () => {
				const date = new Date();
				[
					{
						schema: {type: "Date"},
						value: new Date(),
						name: "basic"
					},
					{
						schema: {
							type: "Date",
							default: date,
							required: true
						},
						expected: date,
						name: "default value"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: "String"});
						orm.Schema.register("test", {key: test.schema});
						const model = orm.create("test");
						if ("value" in test) {
							if (test.from_model) {
								const sub = orm.create("sub");
								sub.set(test.value);
								test.value = [sub];
							}
							model.set({key: test.value});
						}
						if (test.is_model) {
							assert.deepEqual(model.get().key[0].get(), test.expected || test.value);
						} else {
							assert.deepEqual(model.get().key, test.expected || test.value);
						}
					});
				});
			});
			describe("Number", () => {
				[
					{
						schema: {type: "Number"},
						value: new Number(12),
						expected: 12,
						name: "basic"
					},
					{
						schema: {type: "Number"},
						value: 42,
						name: "basic"
					},
					{
						schema: {
							type: "Number",
							default: 1,
							required: true
						},
						expected: 1,
						name: "default value"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: "String"});
						orm.Schema.register("test", {key: test.schema});
						const model = orm.create("test");
						if ("value" in test) {
							if (test.from_model) {
								const sub = orm.create("sub");
								sub.set(test.value);
								test.value = [sub];
							}
							model.set({key: test.value});
						}
						if (test.is_model) {
							assert.deepEqual(model.get().key[0].get(), test.expected || test.value);
						} else {
							assert.deepEqual(model.get().key, test.expected || test.value);
						}
					});
				});
			});
			describe("String", () => {
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
					it(test.name, () => {
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
		});
		describe("invalid", () => {
			describe("Array", () => {
				[
					{
						schema: {type: "Array"},
						value: "Array",
						name: "basic"
					},
					{
						schema: {type: "Array"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Array"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							type: "Array",
							length: 5
						},
						value: [
							1,
							2,
							3
						],
						name: "with length"
					},
					{
						schema: {
							type: "Array",
							min: 1
						},
						value: [],
						name: "with min"
					},
					{
						schema: {
							type: "Array",
							max: 5
						},
						value: [
							1,
							2,
							3,
							4,
							5,
							6
						],
						name: "with max"
					},
					{
						schema: {
							type: "Array",
							item: "sub"
						},
						value: [
							new Boolean(true)
						],
						name: "invalid item type"
					},
					{
						schema: {
							type: "Array",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: "String"});
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
			describe("Boolean", () => {
				[
					{
						schema: {type: "Boolean"},
						value: 1,
						name: "basic"
					},
					{
						schema: {type: "Boolean"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Boolean"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							type: "Boolean",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
			describe("Date", () => {
				[
					{
						schema: {type: "Date"},
						value: 1,
						name: "basic"
					},
					{
						schema: {type: "Date"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Date"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							type: "Date",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
			describe("Mixed", () => {
				[
					{
						schema: {type: "Mixed"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Mixed"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							type: "Mixed",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
			describe("Number", () => {
				[
					{
						schema: {type: "Number"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Number"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {type: "Number"},
						value: "",
						name: "basic"
					},
					{
						schema: {
							type: "Number",
							min: 0
						},
						value: -1,
						name: "with min"
					},
					{
						schema: {
							type: "Number",
							max: 5
						},
						value: 6,
						name: "with max"
					},
					{
						schema: {
							type: "Number",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
			describe("Object", () => {
				[
					{
						schema: {type: "Object"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Object"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							key: "String",
							value: "Number"
						},
						value: {not_existing: "key"},
						name: "not existing key"
					},
					{
						schema: {
							key: "Number",
							value: "Number"
						},
						value: {wrong: "key type"},
						name: "wrong key type"
					},
					{
						schema: {
							key: "Number",
							value: "Number"
						},
						value: {key: "key type"},
						name: "wrong key type"
					},
					{
						schema: {
							key: "sub",
							value: "Number"
						},
						value: {key: "key type"},
						name: "wrong key type"
					},
					{
						schema: {
							type: "Object",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: test.schema});
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
			describe("ObjectID", () => {
				[
					{
						schema: {type: "ObjectID"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "ObjectID"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {type: "ObjectID"},
						value: "wrong string value",
						name: "basic"
					},
					{
						schema: {
							type: "ObjectID",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
						const orm = new Orm();
						orm.Schema.register("sub", {key: test.schema});
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
			describe("Mixed", () => {
				[
					{
						schema: {type: "Mixed"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "Mixed"},
						value: undefined,
						name: "basic"
					},
					{
						schema: {
							type: "Mixed",
							required: true
						},
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
			describe("String", () => {
				[
					{
						schema: {type: "String"},
						value: true,
						name: "basic"
					},
					{
						schema: {type: "String"},
						value: null,
						name: "basic"
					},
					{
						schema: {type: "String"},
						value: undefined,
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
						name: "missing required"
					}
				].forEach((test) => {
					it(test.name, () => {
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
});
