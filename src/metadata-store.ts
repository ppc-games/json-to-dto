import { ClassType, PropMetadata, PropValidator } from './types';

/** classSet is a set that stores the constructor of all classes registered with the @Class decorator. */
export const classSet: Set<ClassType> = new Set();

/**
 * propMetadataByClassType is a map,
 * key = the constructor of the custom class,
 * value = a map of all the metadata of the properties registered by the @Prop of the corresponding class, indexed by property name.
 */
export const classTypeToPropMetadata: Map<ClassType, Map<string, PropMetadata>> = new Map();

/**
 * classTypeToPropValidator is a map,
 * key = the constructor of the custom class,
 * value = a map of all the PropValidators of the properties registered by the @Prop of the corresponding class, indexed by property name.
 */
export const classTypeToPropValidator: Map<ClassType, Map<string, PropValidator[]>> = new Map();

/** getOrCreateMetadataMap returns or creates and returns a map of property metadata for the class based on the constructor of the class. */
export function getOrCreateMetadataMap(clsCtor: ClassType): Map<string, PropMetadata> {
  let propNameToMetadata = classTypeToPropMetadata.get(clsCtor);
  if (propNameToMetadata == undefined) {
    propNameToMetadata = new Map<string, PropMetadata>();
    classTypeToPropMetadata.set(clsCtor, propNameToMetadata);
  }
  return propNameToMetadata;
}

/** getOrCreateValidatorMap returns or creates and returns an array of all validation functions for the class based on the constructor of the class. */
export function getOrCreateValidatorMap(clsCtor: ClassType): Map<string, PropValidator[]> {
  let propNameToValidators = classTypeToPropValidator.get(clsCtor);
  if (propNameToValidators == undefined) {
    propNameToValidators = new Map<string, PropValidator[]>();
    classTypeToPropValidator.set(clsCtor, propNameToValidators);
  }
  return propNameToValidators;
}
