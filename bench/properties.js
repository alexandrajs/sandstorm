/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
'use strict';
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;
const properties = require('../src/properties');
const benchmarks = {
	ArrayProperty: [
		{length: 2},
		{
			min: 2,
			max: 3
		},
		{
			min: 2,
			max: 3,
			required: true
		},
		{
			min: 2,
			max: 3,
			default: []
		}
	],
	BooleanProperty: [
		{required: true},
		{
			required: true,
			default: false
		}
	],
	DateProperty: [
		{required: true},
		{
			required: true,
			default: false
		},
		{
			required: true,
			min: new Date()
		},
		{
			required: true,
			default: false,
			min: new Date(),
			max: new Date()
		}
	],
	MixedProperty: [
		{required: true},
		{
			required: false,
			default: 0
		}
	],
	NumberProperty: [
		{required: true},
		{
			required: false,
			default: 0
		}
	],
	/*ObjectProperty,*/
	StringProperty: [
		{length: 2},
		{
			min: 2,
			max: 3
		},
		{
			min: 2,
			max: 3,
			required: true
		},
		{
			min: 2,
			max: 3,
			default: []
		}
	]
};

function nop() {
}

suite.add('nop', function () {
	nop();
});
Object.keys(benchmarks).reverse().forEach((key) => {
	const values = benchmarks[key];
	const property = properties[key];
	suite.add(key + ' #' + values.length, function () {
		values.forEach((value) => {
			new property(value);
		});
	});
});
suite.on('cycle', function (event) {
	console.log(String(event.target));
}).run({'async': true});