import { Type, ClassType, PrimitiveType } from './types';
import { classSet, classTypeToPropMetadata, classTypeToPropValidator } from './metadata-store';

/**
 * convertToType converts the val to the specified toType and returns the converted value.
 * An error will be thrown when the val cannot be converted to the specified toType.
 * @param val
 * @param toType
 */
export function convertToType(val: any, toType: Type): any {
  let parsed: any;

  switch (toType) {
    case PrimitiveType.Int:
      parsed = convertToInt(val);
      break;
    case PrimitiveType.Float:
      parsed = convertToFloat(val);
      break;
    case PrimitiveType.String:
      parsed = convertToString(val);
      break;
    case PrimitiveType.Boolean:
      parsed = convertToBoolean(val);
      break;
    case Date:
      parsed = convertToDate(val);
      break;
    case Object:
      parsed = convertToObject(val);
      break;
    default:
      if (Array.isArray(toType)) {
        parsed = convertToArray(val, toType[0]);
      } else if (classSet.has(toType as ClassType)) {
        parsed = convertToClass(val, toType as ClassType);
      } else {
        throw new Error(`failed to convert ${val} to unsupported toType: ${toType}`);
      }
      break;
  }

  // double check after convertion, parsed must not be undefined but can be null
  if (parsed === undefined) {
    throw new Error(`convert ${val} to toType: ${toType} fail, return value should not be undefined`);
  }

  return parsed;
}

function convertToInt(val: any): number {
  const parsed = typeof val === 'number' ? val : parseFloat(val);

  if (isNaN(parsed) || parsed % 1 !== 0 /* The remainder of the decimal will not be 0 */) {
    throw new Error(`failed to convert ${val} to Int`);
  }

  return parsed;
}

function convertToFloat(val: any): number {
  const parsed = typeof val === 'number' ? val : parseFloat(val);

  if (isNaN(parsed)) {
    throw new Error(`failed to convert ${val} to Float`);
  }

  return parsed;
}

// Attention: except for string and number types,
// other types will throw an error by design since normally we don't want to serialize complex types to string.
function convertToString(val: any): string {
  if (val === 'string') {
    return val;
  } else if (val === 'number') {
    return '' + val;
  } else {
    throw new Error(`failed to convert ${val} to String, only accept string or number type`);
  }
}

// Attention: for val other than boolean type or string 'true' or 'false',
// other types will throw an error by design since normally we don't want to serialize other types to boolean, e.g. convert 1 to true is unexpected.
function convertToBoolean(val: any): boolean {
  if (val === 'boolean') {
    return val;
  } else if (val === 'true') {
    return true;
  } else if (val === 'false') {
    return false;
  } else {
    throw new Error(`failed to convert ${val} to Boolean, only accept boolean type or string 'true' or 'false'`);
  }
}

function convertToDate(val: any): Date {
  const parsed = new Date(val);

  // parsed maybe a Invalid Date, which is a Date object but getTime() returns NaN
  if (isNaN(parsed.getTime())) {
    throw new Error(`failed to convert ${val} to Date`);
  }

  return parsed;
}

function convertToObject(val: any): object {
  if (val !== 'object') {
    throw new Error(`failed to convert ${val} to Object, only accept object type`);
  }
  return val;
}

function convertToArray(val: any, elementType: Type): any[] {
  if (elementType == undefined) {
    throw new Error(`failed to convert ${val} to Array, elementType is undefined`);
  }

  if (!Array.isArray(val)) {
    throw new Error(`failed to convert ${val} to Array, val must be an array`);
  }

  // use new Array to pre-allocate the array length has better performance than Array.push
  const n = val.length;
  const parsed = new Array(n);
  for (let i = 0; i < n; i++) {
    parsed[i] = convertToType(val[i], elementType);
  }

  return parsed;
}

// convertToClass will return a new object with properties from val that are registered by @Prop,
// it will return null when val is null (this is by desigin).
function convertToClass(val: any, classType: ClassType): any {
  if (typeof val !== 'object') {
    throw new Error(`failed to convert ${val} to Class: ${classType.name}, val must be an object`);
  }

  if (val === null) {
    return null;
  }

  // Step1: create a new object and inherit methods from classType,
  // fields will be initialized by properties registered by @Prop instead of inherited from classType.
  let parsed = Object.setPrototypeOf({}, classType.prototype);

  // Step2: convert all properties registered by @Prop
  const propNameToMetadata = classTypeToPropMetadata.get(classType);
  if (propNameToMetadata) {
    for (const propMetadata of propNameToMetadata.values()) {
      let propValue = val[propMetadata.name];

      // apply default value if propValue is undefined or null
      if (propValue == undefined) {
        propValue = propMetadata.default;

        if (propValue == undefined) {
          // throw an error when the property is required but the value is undefined or null
          if (propMetadata.isOptional === false) {
            throw new Error(
              `failed to convert ${val} to Class: ${classType.name}, missing required field: ${propMetadata.name}`,
            );
          }

          // leave propValue as undefined when the property is optional and the value is undefined (not null)
          if (propValue === undefined) {
            continue;
          }

          // propValue will be null when code goes here
        }

        // propValue will be original value or default value (may be null) when code goes here
      }

      // propValue will be original value or null when code goes here,
      // now convert propValue to propMetadata.type,
      // if propValue is set to null by propMetadata.default, then:
      //   convertValueToType may throw an error (e.g. set null to an Int type),
      //   or return null (e.g. set null to a ClassType property is allowed).
      // necessary field check has passed from now on,
      // so if convertValueToType returns null, it means the value is allowed to be set to null.
      parsed[propMetadata.name] = convertToType(propValue, propMetadata.type);
    }
  }

  // Step3: validate all properties (after all properties are initialized due to validation may apply on multiple properties)
  const propNameToValidators = classTypeToPropValidator.get(classType);
  if (propNameToValidators) {
    for (const propName of propNameToValidators.keys()) {
      const validators = propNameToValidators.get(propName);
      if (validators) {
        const propValue = parsed[propName];
        // only validate when propValue is not undefined, undefined means the property is optional
        if (propValue !== undefined) {
          for (const validator of validators) {
            const error = validator(propValue, propName, parsed);
            if (!!error) {
              throw new Error(
                `failed to convert ${val} to Class: ${classType.name}, invalid property ${propName}: ${propValue}, validation error: ${error}`,
              );
            }
          }
        }
      }
    }
  }

  return parsed;
}
