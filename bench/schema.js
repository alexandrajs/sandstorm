/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Benchmark = require("benchmark");
const suite = new Benchmark.Suite;
const Schema = require("../src/schema");

function nop() {
}

suite.add("nop", function () {
	nop();
}).add("Schema constructor", function () {
	new Schema({schemas: {}});
}).add("Schema register", function () {
	const schema = new Schema({schemas: {}});
	schema.register("name", {
		active: {
			type: "Boolean",
			default: false
		},
		login: "String",
		password: {
			type: "String",
			length: 64,
			pattern: /^[0-9a-f]+$/
		},
		type: "Number",
		account: {
			type: {type: "String"},
			expires: "Date"
		},
		history: [
			{
				date: {
					type: "Date",
					default: Date.new,
					required: true
				},
				action: "String"
			}
		],
		mixed_array: [],
		boolean_array: ["Boolean"],
		array_of_arrays: ["Array"],
		array_of_arrays2: [[]],
		array_of_objects: [{}]
	});
}).on("cycle", function (event) {
	console.log(String(event.target));
}).run({"async": true});