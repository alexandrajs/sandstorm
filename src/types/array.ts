/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as types from "./index"; // Assuming index.ts will have named exports
import * as common from "../common";
import ExtError from "exterror";

// Define complex types as 'any' for now
type ModelInstance = any;
type SchemaProperty = any; // Represents the schema definition for a property

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
    value: any[]
): Promise<void> {
    const length = value.length;
    if (schema.min && length < schema.min) {
        throw new ExtError("ERR_ARRAY_TOO_SHORT", `Array '${path}' is too short. Minimum length: ${schema.min}, got: ${length}`);
    }
    if (schema.max && length > schema.max) {
        throw new ExtError("ERR_ARRAY_TOO_LONG", `Array '${path}' is too long. Maximum length: ${schema.max}, got: ${length}`);
    }

    const itemSchema = schema.item;
    const itemType = itemSchema.type;

    if (itemType === "Mixed") {
        set[key] = target[key] = value.slice();
        return;
    }

    set[key] = [];
    target[key] = [];

    await Promise.all(value.map((item: any, index: number) => {
        return common.setTargetItem({
            types,
            model,
            set: set[key], // Pass the sub-array for set
            target: target[key], // Pass the sub-array for target
            target_key: index.toString(), // Array index as string key
            item,
            item_schema: itemSchema,
            type: itemType,
            key: index.toString(), // Key for the item within the array context
            path: path ? `${path}.${index}` : index.toString(),
            value: item // The 'value' for setTargetItem is the item itself
        });
    }));
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
    if (!Array.isArray(value)) {
        throw new ExtError("ERR_WRONG_PROPERTY_TYPE", `Expected value of '${path}' to be instance of Array, got ${typeof value}`);
    }
    await _set(model, target, set, schema, key, path, value);
}

export const get = common.modelGet;
