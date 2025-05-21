/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import { MixedProperty, MixedPropertyOptions } from "./mixed";
// Removed other direct property imports as they are not used in this simplified version
// and to avoid potential issues if those files are not yet perfect modules.

export interface ArrayPropertyOptions {
    length?: number;
    min?: number;
    max?: number;
    required?: boolean;
    unique?: boolean;
    default?: any[];
    item?: any; // Kept as 'any'. Schema parser will determine actual type/instance.
}

/**
 * @constructor
 */
export class ArrayProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public default?: any[];
    public item: any; 
    public min?: number;
    public max?: number;

    constructor(options: ArrayPropertyOptions = {}) { 
        if (options.length !== undefined) {
            options.min = options.max = options.length;
        }
        this.type = "Array";
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
        
        // Store the item definition (or instance if provided directly, though unusual here)
        // The Schema's _expandProperty method is responsible for creating the actual Property instance for 'item'.
        this.item = options.item !== undefined ? options.item : { type: "Mixed" }; // Store definition or default
        
        this.min = options.min;
        this.max = options.max;
    }
}
