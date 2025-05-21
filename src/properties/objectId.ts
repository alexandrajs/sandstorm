/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

export interface ObjectIDPropertyOptions {
    coerce?: boolean;
    required?: boolean;
    unique?: boolean;
    default?: any; // Or ObjectId itself
}

/**
 * @constructor
 */
export class ObjectIDProperty {
    public type: string;
    public coerce: boolean;
    public required: boolean;
    public unique: boolean;
    public default: any;

    constructor(options: ObjectIDPropertyOptions = {}) { // Added default value for options
        this.type = "ObjectID";
        this.coerce = options.coerce === undefined ? true : options.coerce;
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
    }
}
