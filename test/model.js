"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const {ObjectID, MongoClient} = require("mongodb");
/**
 *
 * @type {Sandstorm}
 */
const Orm = require("../");
describe("model", () => {
	describe("set", () => {
		const orm = new Orm();
		orm.register("Set", {name: "String"});
		it("not existing prop", () => {
			const model = orm.create("Set");
			assert.throws(() => {
				model.set({notExisting: "key"});
			});
		});
	});
	it("toJSON", () => {
		const orm = new Orm();
		orm.register("ToJson", {name: "String"});
		const model = orm.create("ToJson");
		model.set({name: "key"});
		assert.strictEqual(model.toJSON(), model.data);
	});
	describe("base", () => {
		const orm = new Orm();
		let _db = null;
		before((done) => {
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
			orm.connect("mongodb://localhost/sandstorm_test_model_base").then(() => {
				_db = orm.use("sandstorm_test_model_base");
				return _db.dropDatabase();
			}).then(() => {
				done();
			}).catch(done);
		});
		after((done) => {
			orm.disconnect().then(() => {
				done();
			}).catch(done);
		});
		it("set + merge", function (done) {
			const model = orm.create("Base");
			const date = new Date();
			const objId = new ObjectID();
			model.set({
				array: [
					1,
					"a",
					false,
					{a: 2}
				],
				bool: true,
				date: date,
				mix: "Mixed",
				number: 1.23,
				object: {
					a: 1,
					b: true
				},
				objId: objId,
				string: "String"
			});
			model.save().then(async () => {
				const _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
				assert.deepStrictEqual(_doc, {
					_id: model.data._id,
					array: [
						1,
						"a",
						false,
						{a: 2}
					],
					bool: true,
					date: date,
					mix: "Mixed",
					number: 1.23,
					object: {
						a: 1,
						b: true
					},
					objId: objId,
					string: "String"
				});
				model.set({
					object: {b: false},
					array: [
						1,
						"a",
						true
					]
				});
				return model.save();
			}).then(async () => {
				const _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
				delete _doc._id;
				assert.deepStrictEqual(_doc, {
					object: {b: false},
					array: [
						1,
						"a",
						true
					]
				});
				model.merge({
					object: {c: 3}
				});
				return model.save();
			}).then(async () => {
				let _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
				delete _doc._id;
				assert.deepStrictEqual(_doc, {
					object: {
						b: false,
						c: 3
					},
					array: [
						1,
						"a",
						true
					]
				});
				const cursor = orm.find("Base", {});
				assert.strictEqual(await cursor.count(), 1);
				let doc = await cursor.toArray();
				doc = doc.pop();
				_doc = await _db.collection("Base").findOne({_id: new ObjectID(doc.data._id)});
				assert.deepStrictEqual(doc.data, _doc);
				assert.deepStrictEqual(doc.data, doc.get());
				const get = await orm.get("Base", new ObjectID(doc.data._id));
				done();
			}).catch(done);
		});
	});
	describe("embed", () => {
		let _db = null;
		const orm = new Orm();
		before((done) => {
			orm.connect("mongodb://localhost/sandstorm_test_model_embed").then(() => {
				_db = orm.use("sandstorm_test_model_embed");
				return _db.dropDatabase();
			}).then(() => {
				orm.register("Embed", {
					name: "String",
					value: "String"
				});
				orm.Schema.register("Base", {
					array: {
						type: "Array",
						item: {
							type: "Embed",
							search: ["name"]
						}
					},
					embed: {
						type: "Embed",
						search: ["name"]
					},
					object: {
						array: [
							{
								type: "Embed",
								search: ["name"]
							}
						],
						embed: {
							type: "Embed",
							search: ["name"]
						}
					}
				});
				done();
			}).catch(done);
		});
		after((done) => {
			orm.disconnect().then(() => {
				done();
			}).catch(done);
		});
		it("base", function (done) {
			const model = orm.create("Base");
			model.set({
				array: [
					{
						name: "in_array",
						value: "dont save this shit"
					}
				],
				object: {
					array: [
						{
							name: "in_object_array",
							value: "dont save this shit"
						}
					],
					embed: {
						name: "in_object",
						value: "dont save this shit"
					}
				},
				embed: {
					name: "in_root",
					value: "dont save this shit"
				}
			});
			model.save().then(async () => {
				const _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
				/*assert.deepStrictEqual(_doc, {});
				model.set({
					object: {b: false},
					array: [
						1,
						"a",
						true
					]
				});*/
				return model.save();
			}).then(() => {
				/*model.merge({
					object: {c: 3}
				});
				return model.save();*/
			}).then(async () => {
				const cursor = orm.find("Base", {});
				assert.strictEqual(await cursor.count(), 1);
				let doc = await cursor.toArray();
				doc = doc.pop();
				const _doc = await _db.collection("Base").findOne({_id: new ObjectID(doc.data._id)});
				assert.deepStrictEqual(doc.data, _doc);
				assert.deepStrictEqual(doc.data, doc.get());
				const get = await orm.get("Base", new ObjectID(doc.data._id));
				done();
			}).catch(done);
		});
	});
});
