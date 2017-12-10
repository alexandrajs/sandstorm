"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const ObjectID = require('mongodb').ObjectID;
const Orm = require("../");
const orm = new Orm();
orm.Schema.register("Base", {
	array: [],
	bool: "Boolean",
	date: "Date",
	mix: "Mixed",
	number: "Number",
	object: {},
	objId: "ObjectID",
	string: "String"
});
describe("model", () => {
	before((done) => {
		orm.connect('mongodb://localhost/sandstorm_test').then(() => {
			done();
		}).catch(done);
	});
	describe("base", () => {
		it("", function (done) {
			const model = orm.create("Base");
			const date = new Date();
			const objId = new ObjectID();
			model.set({
				array: [
					1,
					'a',
					true,
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
			model.save().then(() => {
				model.set({object: {b: false}});
				return model.save();
			}).then(() => {
				/*const cursor = orm.find('Base', {});
				cursor.count().then(console.log);
				cursor.toArray().then(console.log).catch(console.log);*/
				done();
			}).catch(done);
		});
	});
});
