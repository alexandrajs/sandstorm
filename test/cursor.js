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
orm.register("Sub", {
	name: "String",
	value: "String"
});
orm.Schema.register("Base", {
	array: [
		{
			type: "Sub",
			embed: ["name"]
		}
	]
});
let _db = null;
describe("cursor", () => {
	before((done) => {
		orm.connect("mongodb://localhost/sandstorm_test_cursor").then(() => {
			return orm.use("sandstorm_test_cursor");
		}).then((db) => {
			_db = db;
			return _db.dropDatabase();
		}).then(() => {
			const num = 10;
			const wait = [];
			for (let a = 0; a < num; a++) {
				const model = orm.create("Base");
				model.set({
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
				});
				wait.push(model.save());
			}
			return Promise.all(wait);
		}).then(() => {
			done();
		}).catch(done);
	});
	it("hydrate", (done) => {
		orm.find("Base", {"array.name": "One5"}).hydrate(["Sub"]).toArray()
			.then((results) => {
				const subs = results.pop().get().array.map(_ => _.get());
				subs.forEach(_ => assert(_.value === "5"));
				done();
			}).catch(done);
	});
	it("skip + hydrate", (done) => {
		orm.find("Base", {}).skip(5).hydrate(["Sub"]).toArray()
			.then((results) => {
				assert(results.length === 5);
				done();
			}).catch(done);
	});
	it("limit + hydrate", (done) => {
		orm.find("Base", {}).limit(5).hydrate(["Sub"]).toArray()
			.then((results) => {
				assert(results.length === 5);
				done();
			}).catch(done);
	});
	it("sort asc + hydrate", (done) => {
		orm.find("Base", {}).sort({"array.name": 1}).limit(2).hydrate(["Sub"]).toArray()
			.then((results) => {
				assert(results.length === 2);
				const dry = results.map(_ => _.get());
				assert(dry.shift().array[0].get().name === "One0");
				assert(dry.shift().array[0].get().name === "One1");
				done();
			}).catch(done);
	});
	it("sort desc + hydrate", (done) => {
		orm.find("Base", {}).sort({"array.name": -1}).limit(2).hydrate(["Sub"]).toArray()
			.then((results) => {
				assert(results.length === 2);
				const dry = results.map(_ => _.get());
				assert(dry.shift().array[0].get().name === "One9");
				assert(dry.shift().array[0].get().name === "One8");
				done();
			}).catch(done);
	});
});
