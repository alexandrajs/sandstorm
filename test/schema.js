"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const {StringProperty} = require("../src/properties");
const Orm = require("../");
describe("embedded schemas dependencies", () => {
	describe("in array", () => {
		const orm = new Orm();
		orm.register("Sub", {
			name: "String"
		});
		it("from string", () => {
			orm.register("FromString", {sub: ["Sub"]});
			assert.deepStrictEqual(orm.schemas.FromString.dependencies, {Sub: {sub: []}});
		});
		it("from object", () => {
			orm.register("FromObject", {
				sub: {
					type: "Array",
					item: {
						type: "Sub",
						embed: ["name"]
					}
				}
			});
			assert.deepStrictEqual(orm.schemas.FromObject.dependencies, {Sub: {sub: ["name"]}});
		});
	});
	describe("in object", () => {
		const orm = new Orm();
		orm.register("Sub", {
			name: "String"
		});
		it("from string", () => {
			orm.register("FromString", {sub: "Sub"});
			assert.deepStrictEqual(orm.schemas.FromString.dependencies, {Sub: {sub: []}});
		});
		it("from object", () => {
			orm.register("FromObject", {
				sub: {
					type: "Sub",
					embed: ["name"]
				}
			});
			assert.deepStrictEqual(orm.schemas.FromObject.dependencies, {Sub: {sub: ["name"]}});
		});
	});
});
describe("basic types", () => {
	const types = require("../src/types");
	it("sort", () => {
		const deps = {
			A: {
				b: "B",
				obj: {c: "C"}
			},
			B: {c: "C"},
			D: {number: "Number"},
			C: {
				string: "String",
				d: "D"
			}
		};
		const sorted = Object.keys(Orm.Schema.sort(deps));
		assert.deepEqual(sorted, "D,C,B,A".split(","));
	});
	describe("from string", () => {
		const tests = {
			"Array": {
				in: {"key": "Array"},
				out: {
					type: "Array",
					required: false,
					default: undefined,
					item: {
						type: "Mixed",
						required: false,
						default: undefined
					},
					min: undefined,
					max: undefined
				}
			},
			"Array 2": {
				in: {"key": ["Boolean"]},
				out: {
					type: "Array",
					required: false,
					default: undefined,
					item: {
						type: "Boolean",
						required: false,
						default: undefined
					},
					min: undefined,
					max: undefined
				}
			},
			"Boolean": {
				in: {"key": "Boolean"},
				out: {
					type: "Boolean",
					required: false,
					default: undefined
				}
			},
			"Date": {
				in: {"key": "Date"},
				out: {
					type: "Date",
					required: false,
					default: undefined,
					min: undefined,
					max: undefined
				}
			},
			"Mixed": {
				in: {"key": "Mixed"},
				out: {
					type: "Mixed",
					required: false,
					default: undefined
				}
			},
			"Number": {
				in: {"key": "Number"},
				out: {
					type: "Number",
					required: false,
					default: undefined,
					min: undefined,
					max: undefined,
					integer: false,
					autoincrement: false
				}
			},
			"Object": {
				in: {"key": "Object"},
				out: {
					type: "Object",
					required: false,
					default: undefined,
					properties: undefined
				}
			},
			"Object 2": {
				in: {"key": {}},
				out: {
					type: "Object",
					required: false,
					default: undefined,
					properties: undefined
				}
			},
			"ObjectID": {
				in: {"key": "ObjectID"},
				out: {
					type: "ObjectID",
					required: false,
					default: undefined
				}
			},
			"String": {
				in: {"key": "String"},
				out: {
					type: "String",
					required: false,
					default: undefined,
					min: undefined,
					max: undefined,
					pattern: undefined
				}
			}
		};
		Object.keys(tests).forEach((name) => {
			const test = tests[name];
			name += " Schema";
			it(name, () => {
				const orm = new Orm();
				orm.Schema.register(name, test.in);
				assert.deepEqual(orm.schemas[name].properties.key, test.out);
			});
		});
	});
	it("import", () => {
		const orm = new Orm();
		orm.Schema.import({
			Dummy: {
				type: "Dummy",
				properties: {
					key: new StringProperty({}),
					value: new StringProperty({})
				},
				dependencies: {},
				dependents: {}
			}
		});
		assert.deepStrictEqual(orm.schemas, {
			Dummy: {
				type: "Dummy",
				properties: {
					key: new StringProperty({}),
					value: new StringProperty({})
				},
				dependencies: {},
				dependents: {}
			}
		});
	});
	it("export", () => {
		const orm = new Orm();
		orm.Schema.register("Dummy", {
			key: "String",
			value: "String"
		});
		assert.deepStrictEqual(orm.Schema.export(), {
			Dummy: {
				type: "Dummy",
				properties: {
					key: new StringProperty({}),
					value: new StringProperty({})
				},
				dependencies: {},
				dependents: {}
			}
		});
	});
	describe("should throws", () => {
		const tests = {
			"Array": ["NotExisting"],
			"Array 2": {
				type: "Array",
				item: "NotExisting"
			},
			"Object": "NotExisting"
		};
		Object.keys(tests).forEach((name) => {
			const test = tests[name];
			name += " Schema";
			it(name, () => {
				const orm = new Orm();
				assert.throws(() => {
					orm.Schema.register(name, {key: test});
				});
			});
		});
	});
	describe("from object", () => {
		const date_min = new Date("2000-01-01");
		const date_max = new Date("2017-12-31");
		const date_default = () => new Date();
		const tests = {
			"Array": {
				in: {
					"key": {
						type: "Array",
						required: true,
						default: [],
						item: {
							type: "Mixed"
						},
						min: 1,
						max: 2
					}
				},
				out: {
					type: "Array",
					required: true,
					default: [],
					item: {
						type: "Mixed",
						default: undefined,
						required: false
					},
					min: 1,
					max: 2
				}
			},
			"Array 2": {
				in: {
					"key": {
						type: "Array",
						required: true,
						default: [],
						item: {type: "Mixed"},
						length: 5
					}
				},
				out: {
					type: "Array",
					required: true,
					default: [],
					item: {
						type: "Mixed",
						default: undefined,
						required: false
					},
					min: 5,
					max: 5
				}
			},
			"Array 3": {
				in: {
					"key": []
				},
				out: {
					type: "Array",
					required: false,
					default: undefined,
					item: {
						type: "Mixed",
						default: undefined,
						required: false
					},
					min: undefined,
					max: undefined
				}
			},
			"Array 4": {
				in: {
					"key": [{type: "Mixed"}]
				},
				out: {
					type: "Array",
					required: false,
					default: undefined,
					item: {
						type: "Mixed",
						default: undefined,
						required: false
					},
					min: undefined,
					max: undefined
				}
			},
			"Boolean": {
				in: {
					"key": {
						type: "Boolean",
						required: true,
						default: true
					}
				},
				out: {
					type: "Boolean",
					required: true,
					default: true
				}
			},
			"Date": {
				in: {
					"key": {
						type: "Date",
						required: true,
						default: date_default,
						min: date_min,
						max: date_max
					}
				},
				out: {
					type: "Date",
					required: true,
					default: date_default,
					min: date_min,
					max: date_max
				}
			},
			"Mixed": {
				in: {
					"key": {
						type: "Mixed",
						required: true,
						default: {}
					}
				},
				out: {
					type: "Mixed",
					required: true,
					default: {}
				}
			},
			"Number": {
				in: {
					"key": {
						type: "Number",
						required: true,
						default: 5.5,
						min: 1,
						max: 10,
						integer: true,
						autoincrement: true
					}
				},
				out: {
					type: "Number",
					required: true,
					default: 5.5,
					min: 1,
					max: 10,
					integer: true,
					autoincrement: true
				}
			},
			"Object": {
				in: {
					"key": {
						type: "Object",
						required: true,
						default: {},
						properties: {}
					}
				},
				out: {
					type: "Object",
					required: true,
					default: {},
					properties: null
				}
			},
			"Object 2": {
				in: {
					"key": {
						key: "String"
					}
				},
				out: {
					type: "Object",
					required: false,
					default: undefined,
					properties: {
						key: {
							type: "String",
							required: false,
							default: undefined,
							min: undefined,
							max: undefined,
							pattern: undefined
						}
					}
				}
			},
			"Object 3": {
				in: {
					"key": {
						key: {key: "String"}
					}
				},
				out: {
					type: "Object",
					required: false,
					default: undefined,
					properties: {
						key: {
							type: "Object",
							required: false,
							default: undefined,
							properties: {
								key: {
									type: "String",
									required: false,
									default: undefined,
									min: undefined,
									max: undefined,
									pattern: undefined
								}
							}
						}
					}
				}
			},
			"ObjectID": {
				in: {
					"key": {
						type: "ObjectID",
						required: true,
						default: null
					}
				},
				out: {
					type: "ObjectID",
					required: true,
					default: null
				}
			},
			"String": {
				in: {
					"key": {
						type: "String",
						required: true,
						default: "string",
						min: 1,
						max: 10,
						pattern: /^[a-z]*$/
					}
				},
				out: {
					type: "String",
					required: true,
					default: "string",
					min: 1,
					max: 10,
					pattern: /^[a-z]*$/
				}
			},
			"String 2": {
				in: {
					"key": {
						type: "String",
						required: true,
						default: "string",
						length: 5,
						pattern: /^[a-z]*$/
					}
				},
				out: {
					type: "String",
					required: true,
					default: "string",
					min: 5,
					max: 5,
					pattern: /^[a-z]*$/
				}
			}
		};
		Object.keys(tests).forEach((name) => {
			const test = tests[name];
			name += " Schema";
			it(name, () => {
				const orm = new Orm();
				orm.Schema.register(name, test.in);
				assert.deepEqual(orm.schemas[name].properties.key, test.out);
			});
		});
	});
});
