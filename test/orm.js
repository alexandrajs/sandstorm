/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
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
describe("orm", () => {
	before((done) => {
		orm.connect("mongodb://localhost/sandstorm_test_orm").then(() => {
			_db = orm.use("sandstorm_test_orm");
			return _db.dropDatabase();
		}).then(() => {
			done();
		}).catch(done);
	});
	describe("findOne", () => {
		before(() => {
			orm.Schema.register("FindOne", {
				key: "String",
				value: "String"
			});
		});
		it("existing", (done) => {
			const num = 10;
			const wait = [];
			for (let a = 0; a < num; a++) {
				const model = orm.create("FindOne");
				model.set({
					key: "key" + a,
					value: "value" + a
				});
				wait.push(model.save());
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
		it("not existing", (done) => {
			orm.findOne("FindOne", {key: "not existing"}).then((res) => {
				assert.strictEqual(res, null);
				done();
			}).catch(done);
		});
	});
});
