/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";

export interface BooleanPropertyOptions { // Ensure export
    required?: boolean;
    unique?: boolean;
    default?: boolean | (() => boolean); 
}

/**
 * @constructor
 */
export class BooleanProperty {
    public type: string;
    public required: boolean;
    public unique: boolean;
    public default?: boolean | (() => boolean);

    constructor(options: BooleanPropertyOptions = {}) { 
        this.type = "Boolean";
        this.required = options.required || false;
        this.unique = options.unique || false;
        this.default = options.default;
    }
}
