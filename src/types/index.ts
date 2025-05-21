/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
import * as ArrayType from "./array";
import * as BooleanType from "./boolean";
import * as DateType from "./date";
import * as MixedType from "./mixed";
import * as NumberType from "./number";
import * as ObjectType from "./object";
import * as ObjectIDType from "./objectId";
import * as StringType from "./string";

export const Array = ArrayType;
export const Boolean = BooleanType;
export const Date = DateType;
export const Mixed = MixedType;
export const Number = NumberType;
export const Object = ObjectType;
export const ObjectID = ObjectIDType;
export const String = StringType;

// Or, if you prefer to have the 'types' object structure explicitly:
// const types = {
//     Array: ArrayType,
//     Boolean: BooleanType,
//     Date: DateType,
//     Mixed: MixedType,
//     Number: NumberType,
//     Object: ObjectType,
//     ObjectID: ObjectIDType,
//     String: StringType
// };
// export default types;
// However, named exports are generally preferred for better tree-shaking and clarity.
