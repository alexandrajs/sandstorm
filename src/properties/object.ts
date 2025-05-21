/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as common from "../common"; 
// No import from "./index" to avoid circular dependencies

export interface ObjectPropertyOptions {
    required?: boolean;
    unique?: boolean;
    default?: any;
    properties?: Record<string, any>; // Keep as 'any' for definitions; Schema parser resolves to Property instances
}

/**
 * @constructor
 */
export class ObjectProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public default: any;
    public properties?: Record<string, any>; // This will hold expanded Property instances after parsing by Schema

    constructor(options: ObjectPropertyOptions = {}) { 
        this.type = "Object";
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
        // Store the definition; Schema parser will expand this into actual Property instances
        this.properties = options.properties; 
    }
}
