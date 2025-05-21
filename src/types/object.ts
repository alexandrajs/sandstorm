/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as types from "./index";
import * as common from "../common";
import ExtError from "exterror";

// Define complex types as 'any' for now
type ModelInstance = any;
type SchemaProperty = any; // Represents the schema definition for a property, which includes sub-properties

/**
 * @private
 */
async function _set(
    model: ModelInstance,
    target: Record<string, any>,
    set: Record<string, any>,
    schema: SchemaProperty,
    key: string,
    path: string,
    value: Record<string, any>
): Promise<void> {
    if (!schema.properties || common.isEmpty(schema.properties)) {
        target[key] = set[key] = Object.assign({}, value);
        return;
    }

    if (model.overwrite || !common.isPlainObject(target[key])) {
        target[key] = {};
        set[key] = {};
    } else {
        // Ensure we are working with copies
        target[key] = Object.assign({}, target[key]);
        set[key] = Object.assign({}, target[key]); // 'set' should reflect the current state before new values are applied
    }

    const promises: Promise<any>[] = [];
    Object.entries(value).forEach(([itemKey, itemValue]) => {
        if (!schema.properties.hasOwnProperty(itemKey)) {
            promises.push(Promise.reject(new ExtError("ERR_KEY_NOT_ALLOWED", `Key '${itemKey}' in '${path}' is not allowed`)));
            return;
        }
        const itemSchema = schema.properties[itemKey];
        const itemType = itemSchema.type;
        promises.push(common.setTargetItem({ // common.setTargetItem is async
            types,
            model,
            set: set[key], // Pass the sub-object for 'set'
            target: target[key], // Pass the sub-object for 'target'
            target_key: itemKey,
            item: itemValue,
            item_schema: itemSchema,
            type: itemType,
            key: itemKey, // Key for the item within the object context
            path: path ? `${path}.${itemKey}` : itemKey,
            value: itemValue // The 'value' for setTargetItem is the item's value
        }));
    });
    await Promise.all(promises);
}

export async function set(
    model: ModelInstance,
    target: Record<string, any>,
    set: Record<string, any>,
    schema: SchemaProperty,
    key: string,
    path: string,
    value: any
): Promise<void> {
    if (!common.isPlainObject(value)) {
        throw new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be a plain object, got ${typeof value}`);
    }
    await _set(model, target, set, schema, key, path, value);
}

export const get = common.modelGet;
