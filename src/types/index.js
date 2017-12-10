/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const types = {};
module.exports = types;
const Array = require("./array");
types["Array"] = Array;
const Boolean = require("./boolean");
types["Boolean"] = Boolean;
const Date = require("./date");
types["Date"] = Date;
const Mixed = require("./mixed");
types["Mixed"] = Mixed;
const Number = require("./number");
types["Number"] = Number;
const Object = require("./object");
types["Object"] = Object;
const ObjectID = require("./objectId");
types["ObjectID"] = ObjectID;
const String = require("./string");
types["String"] = String;
