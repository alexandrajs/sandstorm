/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

export interface MixedPropertyOptions {
    required?: boolean;
    unique?: boolean;
    default?: any;
}

/**
 * @constructor
 */
export class MixedProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public default: any;

    constructor(options: MixedPropertyOptions) {
        this.type = "Mixed";
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
    }
}
