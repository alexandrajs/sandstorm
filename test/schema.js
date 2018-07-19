"use strict";
/**
 * @ignore
 */
const assert = require("assert");
const {StringProperty} = require("../src/properties");
const Orm = require("../");
describe("$options", () => {
	it("", (done) => {
		const orm = new Orm();
		orm.register("Sub", {
			name: "String",
			$options: {
				indexes: [
					{
						fieldOrSpec: {name: 1},
						options: {unique: true}
					}
				],
				collation: {
					locale: "pl",
					strength: 2
				}
			}
		});
		orm.connect("mongodb://localhost/sandstorm_test_schema_options").then(() => {
			return orm.use("sandstorm_test_schema_options");
		}).then((db) => {
			return db.collection("Sub");
		}).then((collection) => {
			return collection.listIndexes().toArray();
		}).then(() => {
			orm.disconnect();
			done();
		}).catch(done);
	});
});
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
					unique: false,
					default: undefined,
					item: {
						type: "Mixed",
						required: false,
						unique: false,
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
					unique: false,
					default: undefined,
					item: {
						type: "Boolean",
						required: false,
						unique: false,
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
					unique: false,
					default: undefined
				}
			},
			"Date": {
				in: {"key": "Date"},
				out: {
					type: "Date",
					coerce: true,
					required: false,
					unique: false,
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
					unique: false,
					default: undefined
				}
			},
			"Number": {
				in: {"key": "Number"},
				out: {
					type: "Number",
					required: false,
					coerce: true,
					unique: false,
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
					unique: false,
					default: undefined,
					properties: undefined
				}
			},
			"Object 2": {
				in: {"key": {}},
				out: {
					type: "Object",
					required: false,
					unique: false,
					default: undefined,
					properties: undefined
				}
			},
			"ObjectID": {
				in: {"key": "ObjectID"},
				out: {
					type: "ObjectID",
					coerce: true,
					required: false,
					unique: false,
					default: undefined
				}
			},
			"String": {
				in: {"key": "String"},
				out: {
					type: "String",
					required: false,
					unique: false,
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
				dependents: {},
				options: {}
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
						unique: false,
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
					unique: false,
					default: [],
					item: {
						type: "Mixed",
						default: undefined,
						required: false,
						unique: false
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
						unique: false,
						default: [],
						item: {
							type: "Mixed",
							unique: false
						},
						length: 5
					}
				},
				out: {
					type: "Array",
					required: true,
					unique: false,
					default: [],
					item: {
						type: "Mixed",
						default: undefined,
						required: false,
						unique: false
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
					unique: false,
					default: undefined,
					item: {
						type: "Mixed",
						default: undefined,
						required: false,
						unique: false
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
					unique: false,
					default: undefined,
					item: {
						type: "Mixed",
						default: undefined,
						required: false,
						unique: false
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
						unique: false,
						default: true
					}
				},
				out: {
					type: "Boolean",
					required: true,
					unique: false,
					default: true
				}
			},
			"Date": {
				in: {
					"key": {
						type: "Date",
						required: true,
						unique: false,
						default: date_default,
						min: date_min,
						max: date_max
					}
				},
				out: {
					type: "Date",
					required: true,
					unique: false,
					coerce: true,
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
					unique: false,
					default: {}
				}
			},
			"Number": {
				in: {
					"key": {
						type: "Number",
						required: true,
						unique: false,
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
					unique: false,
					coerce: true,
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
						unique: false,
						default: {},
						properties: {}
					}
				},
				out: {
					type: "Object",
					required: true,
					unique: false,
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
					unique: false,
					default: undefined,
					properties: {
						key: {
							type: "String",
							required: false,
							unique: false,
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
					unique: false,
					default: undefined,
					properties: {
						key: {
							type: "Object",
							required: false,
							unique: false,
							default: undefined,
							properties: {
								key: {
									type: "String",
									required: false,
									unique: false,
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
						unique: false,
						default: null
					}
				},
				out: {
					type: "ObjectID",
					coerce: true,
					required: true,
					unique: false,
					default: null
				}
			},
			"String": {
				in: {
					"key": {
						type: "String",
						required: true,
						unique: false,
						default: "string",
						min: 1,
						max: 10,
						pattern: /^[a-z]*$/
					}
				},
				out: {
					type: "String",
					required: true,
					unique: false,
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
						unique: false,
						default: "string",
						length: 5,
						pattern: /^[a-z]*$/
					}
				},
				out: {
					type: "String",
					required: true,
					unique: false,
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
