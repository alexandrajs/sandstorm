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
			search: ["name"]
		}
	]
});
let _db = null;
describe("cursor", () => {
	before((done) => {
		orm.connect("mongodb://localhost/sandstorm_test_cursor").then(() => {
			_db = orm.use("sandstorm_test_cursor");
			return _db.dropDatabase();
		}).then(() => {
			done();
		}).catch(done);
	});
	it("hydrate", (done) => {
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
		Promise.all(wait).then(() => {
			return orm.find("Base", {"array.name": "One5"}).hydrate(["Sub"]).toArray();
		}).then((results) => {
			console.log(JSON.stringify(results[0]));
			done();
		}).catch(done);
	});
});
