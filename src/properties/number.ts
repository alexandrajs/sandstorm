/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

export interface NumberPropertyOptions {
    coerce?: boolean;
    required?: boolean;
    unique?: boolean;
    default?: any; // Or number
    integer?: boolean;
    autoincrement?: boolean;
    min?: number;
    max?: number;
    length?: number; // This was used to set min/max in original JS
}

/**
 * @constructor
 */
export class NumberProperty {
    public type: string;
    public coerce: boolean;
    public required: boolean;
    public unique: boolean;
    public default: any; // Or number
    public integer: boolean;
    public autoincrement: boolean;
    public min?: number;
    public max?: number;

    constructor(options: NumberPropertyOptions) {
        this.type = "Number";
        this.coerce = options.coerce === undefined ? true : options.coerce;
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
        this.integer = options.integer || false;
        this.autoincrement = options.autoincrement || false;
        this.min = options.min;
        this.max = options.max;
        if (options.length !== undefined) { // Handle length alias for min/max
            this.min = options.length;
            this.max = options.length;
        }
    }
}
