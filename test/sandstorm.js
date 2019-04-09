/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
const assert = require("assert");
/**
 *
 * @type {Sandstorm}
 */
const Orm = require("../");
const orm = new Orm();
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
let _db = null;
describe("Sandstorm", () => {
	after(async () => {
		await orm.disconnect();
	});
	before((done) => {
		orm.connect("mongodb://root:root@localhost/admin").then(() => {
			return orm.use("sandstorm_test");
		}).then((db) => {
			_db = db;
			return _db.dropDatabase();
		}).then(() => {
			done();
		}).catch(done);
	});
	describe("findOne", () => {
		before(() => {
			orm.register("Sub", {name: "String"});
			orm.Schema.register("FindOne", {
				key: "String",
				value: "String",
				sub: "Sub"
			});
		});
		it("existing", (done) => {
			const num = 10;
			const wait = [];
			for (let a = 0; a < num; a++) {
				const model = orm.create("FindOne");
				wait.push(model.set({
					key: "key" + a,
					value: "value" + a
				}).then((model) => model.save()));
			}
			Promise.all(wait).then(() => {
				const wait = [];
				for (let a = 0; a < num; a++) {
					wait.push(orm.findOne("FindOne", {key: "key" + a}));
				}
				return Promise.all(wait);
			}).then((results) => {
				results.forEach((model, a) => {
					const result = model.get();
					delete result._id;
					assert.deepStrictEqual(result, {
						key: "key" + a,
						value: "value" + a
					});
				});
				done();
			}).catch(done);
		});
		it("existing + hydrate", (done) => {
			const num = 10;
			const wait = [];
			const sub = orm.create("Sub");
			sub.set({name: "sub"}).then(() => {
				for (let a = 0; a < num; a++) {
					const model = orm.create("FindOne");
					wait.push(model.set({
						key: "skey" + a,
						value: "value" + a,
						sub
					}).then(model => model.save()));
				}
				Promise.all(wait).then(() => {
					const wait = [];
					for (let a = 0; a < num; a++) {
						wait.push(orm.findOne("FindOne", {key: "skey" + a}, {hydrate: ["Sub"]}));
					}
					return Promise.all(wait);
				}).then((results) => {
					results.forEach((model, a) => {
						const result = model.get();
						result.sub = result.sub.get();
						delete result._id;
						delete result.sub._id;
						assert.deepStrictEqual(result, {
							key: "skey" + a,
							value: "value" + a,
							sub: {name: "sub"}
						});
					});
					done();
				}).catch(done);
			});
		});
		it("not existing", (done) => {
			orm.findOne("FindOne", {key: "not existing"}).then((res) => {
				assert.strictEqual(res, null);
				done();
			}).catch(done);
		});
	});
	describe("get", () => {
		const idxs = [];
		const fake_idxs = (new Array(10)).fill("123456789012345678901234");
		before((done) => {
			orm.Schema.register("Get", {
				key: "String",
				value: "String"
			});
			orm.Schema.register("StringId", {
				_id: "String",
				value: "String"
			});
			Promise.all((new Array(10)).fill(0).map((_, idx) => {
				return orm.create("Get").set({key: "" + idx}).then((model) => {
					return model.save().then(idx => idxs.push(idx));
				});
			})).then(() => {
				return orm.create("StringId").set({
					_id: "ID",
					value: "VALUE"
				}).then(model => model.save());
			}).then(() => {
				done();
			}).catch(done);
		});
		it("existing", (done) => {
			orm.get("Get", idxs).then((docs) => {
				docs.forEach((doc, idx) => assert(doc.get()._id.toString() === idxs[idx].toString()));
				done();
			}).catch(done);
		});
		it("not existing", (done) => {
			orm.get("Get", fake_idxs).then((docs) => {
				docs.forEach(doc => assert(doc === null));
				done();
			}).catch(done);
		});
		it("existing StringId", (done) => {
			orm.get("StringId", "ID").then((doc) => {
				console.log(doc);
				assert.deepStrictEqual(doc.get(), {
					_id: "ID",
					value: "VALUE"
				});
				done();
			}).catch(done);
		});
	});
	describe("create", () => {
		before(() => {
			orm.Schema.register("Create", {
				key: "String",
				value: "String"
			});
		});
		it("existing", () => {
			orm.create("Create");
		});
		it("not existing", () => {
			assert.throws(() => {
				orm.create("NotExisting");
			});
		});
		it("not existing", () => {
			assert.throws(() => {
				orm.create(["NotString"]);
			});
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
