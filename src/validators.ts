import { PropValidator } from './types';

/** NewValidatorMin creates a PropValidator that validates val >= min. */
export function NewValidatorMin(min: number): PropValidator {
  return (val, name) => (val >= min ? undefined : `validate prop:${name} fail, expect val:${val} >= min:${min}`);
}

/** NewValidatorMax creates a PropValidator that validates val <= max. */
export function NewValidatorMax(max: number): PropValidator {
  return (val, name) => (val <= max ? undefined : `validate prop:${name} fail, expect value:${val} <= max:${max}`);
}

/** NewValidatorMinMax creates a PropValidator that validates min <= val <= max. */
export function NewValidatorMinMax(min: number, max: number): PropValidator {
  if (max < min) {
    throw new Error(`NewValidatorMinMax() fail, expect max:${max} >= min:${min}'`);
  }
  return (val, name) =>
    min <= val && val <= max ? undefined : `validate prop:${name} fail, expect min:${min} <= val:${val} <= ${max}`;
}

/**
 * NewValidatorEnumValueExist creates a PropValidator that validates val exists in the enumDefine.
 * Attention: It does not support string type enum values,
 * because the string type enum will not generate fields indexed by value after being compiled into js.
 */
export function NewValidatorEnumValueExist(enumDefine: { [key: string]: number | string }): PropValidator {
  return (val, name) =>
    enumDefine[val] != undefined
      ? undefined
      : `validate prop:${name} fail, expect val:${val} exist in enum:${JSON.stringify(enumDefine)}`;
}

/**
 * NewValidatorStringNotEmpty creates a PropValidator that validates val is not an empty string.
 * @param options.trim - When true is passed in, the target value will be trimmed first, and then it will be judged whether it is an empty string. Note: This operation will modify the original value.
 * @param options.max - When passed in, it will be judged whether the length of the string is less than or equal to the specified value.
 * @param options.min - When passed in, it will be judged whether the length of the string is greater than or equal to the specified value.
 */
export function NewValidatorStringNotEmpty(options?: { trim?: boolean; max?: number; min?: number }): PropValidator {
  return (val, name, obj: { [propName: string]: any }) => {
    if (options) {
      if (options.trim) {
        val = ('' + val).trim();
        obj[name] = val;
      }
      if (options.max && val && val.length > options.max) {
        return `validate prop:${name} fail, expect string length:${val.length} <= max:${options.max}`;
      }
      if (options.min && val && val.length < options.min) {
        return `validate prop:${name} fail, expect string length:${val.length} >= min:${options.min}`;
      }
    }
    return val && val.length > 0 ? undefined : `validate prop:${name} fail, expect string length > 0`;
  };
}

/** NewValidatorArrayNotEmpty creates a PropValidator that validates val is not an empty array. */
export function NewValidatorArrayNotEmpty(): PropValidator {
  return (val, name) => (val && val.length > 0 ? undefined : `validate prop:${name} fail, expect Array.length > 0`);
}
