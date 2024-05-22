/** Type represents all the types that convertToType function supports. */
export type Type = PrimitiveType | ArrayType | ClassType | typeof Date | typeof Object;

// prettier-ignore
/** ReturnType is the type that the convertToType function returns. */
export type ReturnType<T> = 
  T extends PrimitiveType.Int ? number :
  T extends PrimitiveType.Float ? number :
  T extends PrimitiveType.String ? string :
  T extends PrimitiveType.Boolean ? boolean :
  T extends ArrayType ? Array<ReturnType<T[0]>> :
  T extends typeof Date ? Date :
  T extends typeof Object ? object :
  T extends ClassType<infer U> ?  U :
  any;

/** PrimitiveType is an enum that defines all the basic types that the convertToType function supports. */
export enum PrimitiveType {
  Int,
  Float,
  String,
  Boolean,
}

/** ArrayType can be used to define an array with elements of the same Type, a: ArrayType must have only one element. */
export type ArrayType = { 0: Type };

/** ClassType represents any class decorated by the @Class() decorator. */
export type ClassType<T = any> = new (...args: any[]) => T;

/**
 * PropMetadata defines the metadata set by the @Prop() decorator,
 * each PropMetadata records the name, type, isOptional, and default value of a property when converting the original JSON object to the class registered by the @Class() decorator.
 */
export type PropMetadata = {
  /** property name in the class */
  name: string;
  /** type that the property will be converted to */
  type: Type;
  /** allow the property missing in the original JSON object when isOptional is true */
  isOptional: boolean;
  /** value applied when the property is missing in the original JSON object. (Note: when default is set, isOptional is forced to be true) */
  default?: any;
};

/**
 * PropValidator is the function signature for custom validation of a property value of an object.
 * @param value - the value of the property
 * @param name - the name of the property in the object
 * @param obj - the object containing the property
 * @returns - return undefined when validation passes; return a string of the failure reason when validation fails.
 */
export type PropValidator = (val: any, name: string, obj: Record<string, any>) => string | undefined;
