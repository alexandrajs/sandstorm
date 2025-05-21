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
    value: boolean
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
    let booleanValue = value;
    if (typeof value !== 'boolean') {
        if (value instanceof Boolean) {
            booleanValue = value.valueOf();
        } else {
            return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be boolean, got ${typeof value}`));
        }
    }
    return _set(model, target, set, schema, key, path, booleanValue);
}

export const get = common.modelGet;
