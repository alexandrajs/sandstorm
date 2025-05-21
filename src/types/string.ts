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
    value: string
): Promise<void> {
    const length = value.length;
    if (schema.min !== undefined && length < schema.min) {
        return Promise.reject(new ExtError("ERR_STRING_TOO_SHORT", `Expected value of '${path}' to be longer than ${schema.min}, got ${length}`));
    }
    if (schema.max !== undefined && length > schema.max) {
        return Promise.reject(new ExtError("ERR_STRING_TOO_LONG", `Expected value of '${path}' to be shorter than ${schema.max}, got ${length}`));
    }
    if (schema.pattern && !schema.pattern.test(value)) {
        return Promise.reject(new ExtError("ERR_STRING_NOT_MATCH_PATTERN", `Value of '${key}' does not match pattern ${schema.pattern}`));
    }
    if (Array.isArray(schema.oneOf) && !schema.oneOf.includes(value)) { // Changed from !~ to !.includes for clarity
        return Promise.reject(new ExtError("ERR_STRING_NOT_ONE_OF", `Value of '${key}' is not one of '${schema.oneOf.join(", ")}'`));
    }
    set[key] = target[key] = value;
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
    let strValue = value;
    if (typeof value !== "string") {
        if (value instanceof String) {
            strValue = value.valueOf();
        } else {
            return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be 'string', got ${typeof value}`));
        }
    }
    return _set(model, target, set, schema, key, path, strValue);
}

export const get = common.modelGet;
