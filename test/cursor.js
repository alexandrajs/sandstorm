/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
/**
 * @ignore
 */
const assert = require("assert");
/**
 *
 * @type {Sandstorm}
 */
const Orm = require("../");
const $options = {
	MongoDB: {
		engine: "mongodb",
		primaryKey: "_id"
	},
	MySQL: {
		engine: "mysql",
		primaryKey: "id"
	}
};
[
	"MySQL",
	"MongoDB"
].forEach((engine) => {
	describe(engine, () => {
		const orm = new Orm(engine === "MongoDB" ? {mongodb: new Orm.Engines.MongoDB()} : {mysql: new Orm.Engines.MySQL()});
		orm.register("Sub", {
			$options: $options[engine],
			name: "String",
			value: "String"
		});
		orm.Schema.register("Base", {
			$options: $options[engine],
			name: "String",
			array: [
				{
					type: "Sub",
					embed: ["name"]
				}
			]
		});
		orm.Schema.register("Collated", {
			$options: $options[engine],
			name: "String",
			array: [
				{
					type: "Sub",
					embed: ["name"]
				}
			]
		});
		let _db = null, _sql_db = null;
		describe("cursor", () => {
			after(async () => {
				engine === "MongoDB" ? await orm.engines.mongodb.disconnect() : await orm.engines.mysql.disconnect();
			});
			before((done) => {
				(engine === "MongoDB" ? (orm.engines.mongodb.connect("mongodb://root:root@localhost/admin").then(() => {
					return orm.engines.mongodb.use("sandstorm_test_cursor");
				}).then((db) => {
					_db = db;
					return _db.dropDatabase();
				})) : (orm.engines.mysql.connect("mysql://root:root@localhost/sandstorm_test_cursor").then(() => {
					return orm.engines.mysql.use("sandstorm_test_cursor");
				}).then(() => {
					return orm.engines.mysql.truncateAll("sandstorm_test_cursor");
				}))).then(() => {
					const num = 10;
					const wait = [];
					for (let a = 0; a < num; a++) {
						const model = orm.create("Base");
						wait.push(model.set({
							name: "Name " + a,
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
						}).then(model => model.save()));
					}
					const colNames = "abc,żółw,Blah,Ćma,ćpa,coś,Alfabet,alfabet,123,lepa".split(",");
					for (let a = 0; a < num; a++) {
						const model = orm.create("Collated");
						wait.push(model.set({
							name: colNames[a],
							array: [
								{
									name: colNames[a] + "One" + a,
									value: "" + a
								},
								{
									name: "Two" + a,
									value: colNames[a]
								}
							]
						}).then(model => model.save()));
					}
					return Promise.all(wait);
				}).then(() => {
					done();
				}).catch(done);
			});
			it("project", function(done) { // FIXME move to Model (get({projection}))
				if (engine === "MySQL") {
					return this.skip();
				}
				orm.find("Base", engine === "MongoDB" ? {"array.name": "One5"} : {name: "Name 5"}).project({array: 0}).toArray()
					.then((results) => {
						const doc = results.pop().get();
						assert.equal(doc.name, "Name 5");
						assert.equal(typeof doc.array, "undefined");
						done();
					}).catch(done);
			});
			it("hydrate", (done) => {
				orm.find("Base", engine === "MongoDB" ? {"array.name": "One5"} : {name: "Name 5"}).hydrate(["Sub"]).toArray()
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
				orm.find("Base", {}).sort(engine === "MongoDB" ? {"array.name": 1} : {name: 1}).limit(2).hydrate(["Sub"]).toArray()
					.then((results) => {
						assert(results.length === 2);
						const dry = results.map(_ => _.get());
						assert.equal(dry.shift().array[0].get().name, "One0");
						assert.equal(dry.shift().array[0].get().name, "One1");
						done();
					}).catch(done);
			});
			it("sort desc + hydrate", (done) => {
				orm.find("Base", {}).sort(engine === "MongoDB" ? {"array.name": -1} : {name: -1}).limit(2).hydrate(["Sub"]).toArray()
					.then((results) => {
						assert(results.length === 2);
						const dry = results.map(_ => _.get());
						assert.equal(dry.shift().array[0].get().name, "One9");
						assert.equal(dry.shift().array[0].get().name, "One8");
						done();
					}).catch(done);
			});
			it("sort desc + collation", function (done) {
				if (engine === "MySQL") {
					return this.skip();
				}
				orm.find("Collated", {}).sort({"name": -1}).collation({
					locale: "pl",
					strength: 3
				}).toArray()
					.then((results) => {
						assert.equal(results.map(_ => _.get().name).join(","), "żółw,lepa,ćpa,Ćma,coś,Blah,Alfabet,alfabet,abc,123");
						done();
					}).catch(done);
			});
		});
	});
});
