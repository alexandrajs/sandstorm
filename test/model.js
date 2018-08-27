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
describe("Model", () => {
	describe("set", () => {
		const orm = new Orm();
		orm.register("Set", {name: "String"});
		it("not existing prop", (done) => {
			const model = orm.create("Set");
			model.set({notExisting: "key"}).then(() => done(new Error("Exception expected"))).catch(() => done());
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
				return orm.use("sandstorm_test_model_base");
			}).then((db) => {
				_db = db;
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
			}).then((model) => {
				return model.save();
			}).then(async () => {
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
				return model.set({
					object: {b: false},
					array: [
						1,
						"a",
						true
					]
				}).then(model => model.save());
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
				return model.merge({
					object: {c: 3}
				}).then(model => model.save());
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
		it("delete", function (done) {
			orm.register("Delete", {name: "String"});
			const model = orm.create("Delete", {name: "test"});
			let _id = null;
			model.save().then(async () => {
				_id = new ObjectID(model.data._id);
				const _doc = await _db.collection("Delete").findOne({_id});
				assert.deepStrictEqual(_doc, {
					_id: model.data._id,
					name: "test"
				});
				return model.delete();
			}).then(async () => {
				const _doc = await _db.collection("Delete").findOne({_id});
				assert(_doc === null);
				done();
			}).catch(done);
		});
	});
	describe("embed", () => {
		let _db = null;
		const orm = new Orm();
		before((done) => {
			orm.connect("mongodb://localhost/sandstorm_test_model_embed").then(() => {
				return orm.use("sandstorm_test_model_embed");
			}).then((db) => {
				_db = db;
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
							embed: ["name"]
						}
					},
					embed: {
						type: "Embed",
						embed: ["name"]
					},
					object: {
						array: [
							{
								type: "Embed",
								embed: ["name"]
							}
						],
						embed: {
							type: "Embed",
							embed: ["name"]
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
		it("base set", async function () {
			const model = orm.create("Base");
			await model.set({
				array: [
					{
						name: "in_array",
						value: "don't embed this"
					}
				],
				object: {
					array: [
						{
							name: "in_object_array",
							value: "don't embed this"
						}
					],
					embed: {
						name: "in_object",
						value: "don't embed this"
					}
				},
				embed: {
					name: "in_root",
					value: "don't embed this"
				}
			});
			await model.save();
			let _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
			assert(_doc.array instanceof Array);
			assert(_doc.array.length === 1);
			assert(_doc.array[0]._id instanceof ObjectID);
			assert(_doc.array[0].name === "in_array");
			assert(_doc.object.array instanceof Array);
			assert(_doc.object.array.length === 1);
			assert(_doc.object.array[0]._id instanceof ObjectID);
			assert(_doc.object.array[0].name === "in_object_array");
			assert(_doc.object.embed._id instanceof ObjectID);
			assert(_doc.object.embed.name === "in_object");
			assert(_doc.embed._id instanceof ObjectID);
			assert(_doc.embed.name === "in_root");
			const embed = await orm.get("Embed", _doc.object.array[0]._id);
			await embed.merge({name: "updated"});
			await embed.save();
		});
		it("base merge", async function () {
			const _embed = orm.create('Embed');
			await _embed.set({
				name: "in_root",
				value: "don't embed this"
			});
			await _embed.save();
			const _embed_in_oa = orm.create('Embed');
			await _embed_in_oa.merge({
				name: "in_object_array",
				value: "don't embed this"
			});
			const model = orm.create("Base");
			await model.merge({
				array: [
					{
						name: "in_array",
						value: "don't embed this"
					}
				],
				object: {
					array: [
						_embed_in_oa
					],
					embed: {
						name: "in_object",
						value: "don't embed this"
					}
				},
				embed : _embed
			});
			await model.save();
			let _doc = await _db.collection("Base").findOne({_id: new ObjectID(model.data._id)});
			assert(_doc.array instanceof Array);
			assert(_doc.array.length === 1);
			assert(_doc.array[0]._id instanceof ObjectID);
			assert(_doc.array[0].name === "in_array");
			assert(_doc.object.array instanceof Array);
			assert(_doc.object.array.length === 1);
			assert(_doc.object.array[0]._id instanceof ObjectID);
			assert(_doc.object.array[0].name === "in_object_array");
			assert(_doc.object.embed._id instanceof ObjectID);
			assert(_doc.object.embed.name === "in_object");
			assert(_doc.embed._id instanceof ObjectID);
			assert(_doc.embed.name === "in_root");
			const embed = await orm.get("Embed", _doc.object.array[0]._id);
			await embed.merge({name: "updated"});
			await embed.save();
			await model.merge({embed: {name:"embed updated"}});
			await model.save();
		});
	});
});
