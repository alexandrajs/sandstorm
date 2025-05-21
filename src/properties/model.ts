/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import { SchemaDefinition } from "../schema"; // Assuming SchemaDefinition is in schema.ts

export interface ModelPropertyOptions {
    type: string; // Name of the referenced model/schema
    required?: boolean;
    unique?: boolean;
    embed?: string[]; // Array of property names to embed
    // Add other options if any
}

/**
 * @constructor
 */
export class ModelProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public embed?: string[];
    public path: string; // Path to this property in the parent schema
    public schema: SchemaDefinition; // Reference to the schema this property belongs to (passed in constructor in original code, but not used in class)

    constructor(options: ModelPropertyOptions, path: string, schema: SchemaDefinition) { // Added schema based on original usage in _expandProperty
        this.type = options.type;
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.embed = options.embed;
        this.path = path;
        this.schema = schema; // Store for potential use, though original class didn't use it directly
    }
}
