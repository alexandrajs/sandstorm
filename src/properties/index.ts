/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
// Correctly re-exporting classes and their option interfaces
export { ArrayProperty, type ArrayPropertyOptions } from "./array";
export { BooleanProperty, type BooleanPropertyOptions } from "./boolean";
export { DateProperty, type DatePropertyOptions } from "./date";
export { MixedProperty, type MixedPropertyOptions } from "./mixed";
export { ModelProperty, type ModelPropertyOptions } from "./model";
export { NumberProperty, type NumberPropertyOptions } from "./number";
export { ObjectProperty, type ObjectPropertyOptions } from "./object";
export { ObjectIDProperty, type ObjectIDPropertyOptions } from "./objectId";
export { StringProperty, type StringPropertyOptions } from "./string";

// Import classes for the AnyPropertyInstance union type
import { ArrayProperty as AP_Instance } from "./array";
import { BooleanProperty as BP_Instance } from "./boolean";
import { DateProperty as DP_Instance } from "./date";
import { MixedProperty as MixedP_Instance } from "./mixed";
import { ModelProperty as ModelP_Instance } from "./model";
import { NumberProperty as NP_Instance } from "./number";
import { ObjectProperty as OP_Instance } from "./object";
import { ObjectIDProperty as OIDP_Instance } from "./objectId";
import { StringProperty as SP_Instance } from "./string";

// Import option interfaces for the AnyPropertyOptions union type
import type { ArrayPropertyOptions as APO_Options } from "./array";
import type { BooleanPropertyOptions as BPO_Options } from "./boolean";
import type { DatePropertyOptions as DPO_Options } from "./date";
import type { MixedPropertyOptions as MixedPO_Options } from "./mixed";
import type { ModelPropertyOptions as ModelPO_Options } from "./model";
import type { NumberPropertyOptions as NPO_Options } from "./number";
import type { ObjectPropertyOptions as OPO_Options } from "./object";
import type { ObjectIDPropertyOptions as OIDPO_Options } from "./objectId";
import type { StringPropertyOptions as SPO_Options } from "./string";

export type AnyPropertyInstance = 
    | AP_Instance
    | BP_Instance
    | DP_Instance
    | MixedP_Instance
    | ModelP_Instance
    | NP_Instance
    | OP_Instance
    | OIDP_Instance
    | SP_Instance;

export type AnyPropertyOptions =
    | APO_Options
    | BPO_Options
    | DPO_Options
    | MixedPO_Options
    | ModelPO_Options
    | NPO_Options
    | OPO_Options
    | OIDPO_Options
    | SPO_Options;
