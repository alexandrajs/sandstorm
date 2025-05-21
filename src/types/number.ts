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
    value: number
): Promise<void> {
    if (schema.min !== undefined && value < schema.min) {
        return Promise.reject(new ExtError("ERR_NUMBER_LOWER_THAN_ALLOWED", `Expected value of '${path}' to be greater than ${schema.min}, got ${value}`));
    }
    if (schema.max !== undefined && value > schema.max) {
        return Promise.reject(new ExtError("ERR_NUMBER_GREATER_THAN_ALLOWED", `Expected value of '${path}' to be lower than ${schema.max}, got ${value}`)); // Corrected schema.min to schema.max
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
    let numValue = value;
    if (typeof value === "string" && value.trim().length && schema.coerce) {
        numValue = +value;
    }

    if (Number.isNaN(numValue)) { // Changed from value !== value to Number.isNaN for clarity
        return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be number, got NaN`));
    }

    if (typeof numValue !== "number") {
        if (!(numValue instanceof Number)) {
            return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be number, got ${typeof numValue}`));
        } else {
            numValue = numValue.valueOf();
        }
    }
    return _set(model, target, set, schema, key, path, numValue);
}

export const get = common.modelGet;
