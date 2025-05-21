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
    value: any
): Promise<void> {
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
    if (value == null) { // Checks for null or undefined
        return Promise.reject(new ExtError("ERR_PROPERTY_TYPE_CANT_BE_NULL_OR_UNDEFINED", `Value of '${path}' can not be null or undefined`));
    }
    return _set(model, target, set, schema, key, path, value);
}

export const get = common.modelGet;
