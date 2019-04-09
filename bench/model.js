/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Benchmark = require("benchmark");
const suite = new Benchmark.Suite;
const Orm = require("../src/sandstorm");
const orm = new Orm();
orm.Schema.register("Name", {
	active: {
		type: "Boolean",
		default: false
	},
	login: "String",
	password: {
		type: "String",
		length: 2,
		pattern: /^[0-9a-f]+$/
	},
	type: "Number",
	account: {
		type: {type: "String"},
		expires: "Date",
		options: {prop: "Mixed"}
	},
	history: [
		{
			date: "Date",
			actions: "String"
		}
	],
	mixed_array: ["Mixed"],
	boolean_array: ["Boolean"],
	array_of_arrays: ["Array"]
});
const model = orm.create("Name");

function nop() {
}

orm.connect("mongodb://root:root@localhost/admin").then(() => {
	return orm.use("sandstorm_bench");
}).then(() => {
	model.set({
		active: true,
		login: "String",
		password: "af",
		type: 1,
		account: {
			type: "typ",
			expires: new Date(),
			options: {prop: "test"}
		},
		history: []
	});
	return model.save();
}).then((_id) => {
	suite.add("nop", function () {
		nop();
	}).add("set", {
		defer: true,
		fn: function (deferred) {
			model.set({
				active: true,
				login: "String",
				password: "af",
				type: 1,
				account: {
					type: "typ",
					expires: new Date(),
					options: {prop: "test"}
				},
				history: []
			}).then(() => deferred.resolve()).catch(() => {
				console.error(e);
				process.exit();
			});
		}
	}).add("set + save", {
		defer: true,
		fn: function (deferred) {
			model.set({
				active: true,
				login: "String",
				password: "af",
				type: 1,
				account: {
					type: "typ",
					expires: new Date(),
					options: {prop: "test"}
				},
				history: []
			});
			model.save().then((id) => {
				_id = id;
				deferred.resolve();
			}).catch((e) => {
				console.error(e);
				process.exit();
			});
		}
	}).add("get", function () {
		model.get();
	}).add("orm.get", {
		fn: function (deferred) {
			orm.get("Name", _id).then(() => {
				deferred.resolve();
			}).catch((e) => {
				console.error(e);
				process.exit();
			});
		},
		"defer": true
	}).add("toJSON", function () {
		model.toJSON();
	}).on("cycle", function (event) {
		console.log(String(event.target));
	}).on("complete", function () {
		orm.disconnect();
	}).run({"async": true});
}).catch(console.log);

