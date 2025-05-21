/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

export interface StringPropertyOptions {
    required?: boolean;
    unique?: boolean;
    default?: any; 
    min?: number;
    max?: number;
    length?: number; 
    pattern?: RegExp;
    oneOf?: string[];
}

/**
 * @constructor
 */
export class StringProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public default: any; 
    public min?: number;
    public max?: number;
    public pattern?: RegExp;
    public oneOf?: string[];

    constructor(options: StringPropertyOptions = {}) { 
        if (options.length !== undefined) {
            options.min = options.max = options.length;
        }
        this.type = "String";
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
        this.min = options.min;
        this.max = options.max;
        this.pattern = options.pattern;
        this.oneOf = options.oneOf;
    }
}
