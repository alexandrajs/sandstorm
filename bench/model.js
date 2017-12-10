/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;
const Orm = require('../src/sandstorm');
const orm = new Orm({schemas: {}});
orm.Schema.register('name', {
	active: {
		type: 'Boolean',
		default: false
	},
	login: 'String',
	password: {
		type: 'String',
		length: 2,
		pattern: /^[0-9a-f]+$/
	},
	type: 'Number',
	account: {
		type: {type: "String"},
		expires: 'Date',
		options: {prop: 'Mixed'}
	},
	history: [
		{
			date: 'Date',
			actions: 'String'
		}
	],
	mixed_array: ['Mixed'],
	boolean_array: ['Boolean'],
	array_of_arrays: ['Array']
});
const model = orm.create('name');

function nop() {
}

suite.add('nop', function () {
	nop();
}).add('set', function () {
	model.set({
		active: true,
		login: 'String',
		password: 'af',
		type: 1,
		account: {
			type: "typ",
			expires: new Date(),
			options: {prop: 'test'}
		},
		history: []
	});
}).add('get', function () {
	model.get();
}).add('toJSON', function () {
	model.toJSON();
}).on('cycle', function (event) {
	console.log(String(event.target));
}).run({'async': true});
