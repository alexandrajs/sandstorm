/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const MongoDB = require("./mongodb");
const MySQL = require("./mysql");
/**
 *
 * @type {{MongoDB: MongoDB, MySQL: MySQL}}
 */
module.exports = {
	MongoDB,
	MySQL
};
