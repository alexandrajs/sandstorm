/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as common from "../common";
import { ObjectId } from "mongodb"; // Corrected import
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
    value: ObjectId // Value is now strictly ObjectId after processing
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
    let objectIdValue = value;
    if (typeof value === "string" && schema.coerce) {
        try {
            objectIdValue = new ObjectId(value);
        } catch (e: any) { // Catching error if string is not a valid ObjectId
            return Promise.reject(new ExtError("ERR_INVALID_OBJECTID_STRING", `Value '${value}' for '${path}' is not a valid ObjectId string. Details: ${e.message}`));
        }
    }
    
    if (!(objectIdValue instanceof ObjectId)) {
        return Promise.reject(new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be instance of ObjectId or a valid ObjectId string, got ${typeof objectIdValue}`));
    }
    return _set(model, target, set, schema, key, path, objectIdValue);
}

export const get = common.modelGet;
