/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

interface DatePropertyOptions {
    coerce?: boolean;
    required?: boolean;
    unique?: boolean;
    default?: any; // Or Date
    min?: Date | string | number;
    max?: Date | string | number;
}

/**
 * @constructor
 */
export class DateProperty {
    public type: string;
    public coerce: boolean;
    public required: boolean;
    public unique: boolean;
    public default: any; // Or Date
    public min?: Date | string | number;
    public max?: Date | string | number;

    /**
     *
     * @param options
     */
    constructor(options: DatePropertyOptions) {
        this.type = "Date";
        this.coerce = options.coerce === undefined ? true : options.coerce;
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
        this.min = options.min;
        this.max = options.max;
    }
}

// No need for module.exports when using 'export class'
