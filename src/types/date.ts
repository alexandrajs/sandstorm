/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as common from "../common";
import ExtError from "exterror";

// Define complex types as 'any' for now
type ModelInstance = any;
type SchemaProperty = any;

/**
 * @private
 */
function _set(
    model: ModelInstance,
    target: Record<string, any>,
    set: Record<string, any>,
    schema: SchemaProperty,
    key: string,
    path: string,
    value: Date
): Promise<void> {
    set[key] = target[key] = new Date(value.toJSON()); // Ensure a new Date object is created
    return Promise.resolve();
}

export function set(
    model: ModelInstance,
    target: Record<string, any>,
    set: Record<string, any>,
    schema: SchemaProperty,
    key: string,
    path: string,
    value: any
): Promise<void> {
    let dateValue = value;
    if (typeof value === "string" && schema.coerce) {
        dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) { // Check if date is valid
            return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be a valid Date string, got '${value}'`));
        }
    }
    
    if (!(dateValue instanceof Date)) {
        return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be instance of Date, got ${typeof dateValue}`));
    }
    return _set(model, target, set, schema, key, path, dateValue);
}

export const get = common.modelGet;
