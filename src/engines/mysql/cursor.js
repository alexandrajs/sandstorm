/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const Model = require("../../model");
const fast = require("fast.js");
const Promise = require("bluebird");
const ExtError = require("exterror");

/**
 *
 * @param {Object|string} query
 * @param {Sandstorm} orm
 * @param {string} name
 * @param {Object} [options]
 * @constructor
 */
function Cursor(query, orm, name, options) {
	this.engine = orm.engines.mysql;
	this.query = query;
	this.orm = orm;
	this.name = name;
	this.options = {
		hydrate: [],
		raw: false
	};
	this.setOptions(options);
	if (this.options.collation) {
		this.collation(this.options.collation);
	}
}

/**
 *
 * @param {Object} options
 */
Cursor.prototype.setOptions = function (options) {
	fast.assign(this.options, options || {});
};
/**
 *
 * @param {Object} [options]
 * @returns {Promise}
 */
Cursor.prototype.toArray = function (options) {
	this.setOptions(options);
	return new Promise((resolve, reject) => {
		const connection = this.engine.connection;
		const where = (typeof this.query === "string" ? this.query : Cursor.transformQuery(this.query));
		let sql = "SELECT * FROM " + connection.escapeId(this.name);
		if (where) {
			sql += " WHERE " + where;
		}
		let skip = 0, limit = 0;
		fast.object.forEach(this.options || {}, (value, key) => {
			switch (key) {
				case "skip":
					skip = value;
					break;
				case "limit":
					limit = value;
					break;
				case "sort":
					/*console.log("SORT", value.keyOrList);*/
					sql += " ORDER BY ";
					if (typeof value.keyOrList === "object") {
						const list = [];
						fast.object.forEach(value.keyOrList, (value, key) => {
							list.push("`" + key + "` " + (value === -1 ? "DESC" : "ASC"));
						});
						sql += list.join(", ");
					} else {
						sql += "`" + value.keyOrList + "` " + (value.direction === -1 ? "DESC" : "ASC");
					}
					break;
				default:
					break;
			}
		});
		if (skip || limit) {
			sql += " LIMIT " + (skip ? (skip + (limit ? ", " : "")) : "") + (limit ? limit : "");
		}
		/*console.log("'" + sql + "'");*/
		connection.query({
			sql,
			typeCast: function (field, next) {
				if (field.type === "JSON" && field.length) {
					return JSON.parse(field.string()); // 1 = true, 0 = false
				}
				return next();
			}
		}, (err, docs) => {
			if (err) {
				return reject(err);
			}
			if (this.options.raw && !this.options.hydrate.length) {
				if(this.options.project) {
					return docs.map();
				}
				return docs;
			}
			const models = docs.map((doc) => new Model(this.orm, this.name, doc));
			if (this.options.hydrate.length) {
				return resolve(Promise.all(models.map((model) => {
					return model.hydrate(this.options.hydrate);
				})));
			}
			return resolve(models);
		});
	});
};
/* istanbul ignore next */
/**
 *
 * @param options
 */
Cursor.prototype.stream = function (options) {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.map = function () {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.filter = function () {
	// TODO: implement
};
/* istanbul ignore next */
Cursor.prototype.forEach = function () {
	// TODO: implement
};
/**
 *
 * @param {Object} value
 * @returns {Cursor}
 */
Cursor.prototype.project = function (value) {
	this.options.project = value;
	return this;
};
/**
 *
 * @param {Object} collation
 * @returns {Cursor}
 */
Cursor.prototype.collation = function (collation) {
	this.options.collation = collation;
	return this;
};
/**
 *
 * @param {number} value
 * @returns {Cursor}
 */
Cursor.prototype.limit = function (value) {
	this.options.limit = value;
	return this;
};
/**
 *
 * @param {string|Array|Object} keyOrList
 * @param {number} direction
 * @returns {Cursor}
 */
Cursor.prototype.sort = function (keyOrList, direction) {
	this.options.sort = {
		keyOrList,
		direction
	};
	return this;
};
/**
 *
 * @param {number} value
 * @returns {Cursor}
 */
Cursor.prototype.skip = function (value) {
	this.options.skip = value;
	return this;
};
/**
 *
 * @param {boolean} applySkipLimit
 * @param {object} options
 */
Cursor.prototype.count = function (applySkipLimit, options) {
	return this.cursor.count(applySkipLimit, options);
};
/**
 *
 * @param names
 * @returns {Cursor}
 */
Cursor.prototype.hydrate = function (names) {
	if (!(names instanceof Array)) {
		throw new ExtError("Must be array");
	}
	this.options.hydrate = names;
	return this;
};
Cursor.transformQuery = function (query) {
	const map = { // FIXME
		$eq: "=",
		$ne: "!="
	};

	function transform(block, glue) {
		let parts = [];
		for (const key in block) {
			if (!block.hasOwnProperty(key)) {
				continue;
			}
			const val = block[key];
			if (key[0] === "$") {
				switch (key) {
					default:
						break;
				}
			}
			let keys = [];
			if (val && typeof val === "object") {
				keys = Object.keys(val);
			}
			if (val && typeof val === "object" && keys.length === 1 && keys[0][0] === "$") {
				parts.push("`" + key + "`" + map[keys[0]] + "'" + val[keys[0]] + "'");
			} else if (typeof val === "string") {
				if (key.includes(".")) {
					const path = key.split(".");
					const json_key = "`" + path.shift() + "`->\"$." + path.join(".") + "\"";
					parts.push(json_key + "='" + val + "'");
				} else {
					parts.push("`" + key + "`='" + val + "'");
				}
			}
		}
		return parts.join(` ${glue} `);
	}

	return transform(query, "AND");
};
module.exports = Cursor;
