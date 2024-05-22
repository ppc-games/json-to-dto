import { ClassType, PropMetadata, PropValidator, Type } from './types';
import {
  classSet,
  classTypeToPropMetadata,
  classTypeToPropValidator,
  getOrCreateMetadataMap,
  getOrCreateValidatorMap,
} from './metadata-store';

/**
 * Class creates a @Class decorator that registers a class in the classSet,
 * after the class is registered, a raw JSON object can be converted to an instance of the class using convertToType.
 */
export function Class(): ClassDecorator {
  return (clsCtor) => {
    // get the parent class constructor
    const parentCtor = Object.getPrototypeOf(clsCtor);

    // Go through all the parent class's properties and add them to the current class's property map
    // Attention: If the current class has already registered the same property,
    // then give up the same property registered by the parent class,
    // because the child class overrides the same property registered by the parent class.
    const parentMetadataMap = classTypeToPropMetadata.get(parentCtor);
    if (parentMetadataMap) {
      const currentMetadata = getOrCreateMetadataMap(clsCtor as any as ClassType);
      for (const parentMetadata of parentMetadataMap.values()) {
        if (currentMetadata.has(parentMetadata.name) === false) {
          currentMetadata.set(parentMetadata.name, parentMetadata);
          // console.log(`${clsCtor.name}.${parentMetadata.name} -> ${parentCtor.name}`);
        }
      }
    }

    // Go through all the parent class's validators and add them to the current class's validator.
    // Attention: If the current class has already registered the same property validator,
    // then give up the same property validator registered by the parent class.
    const parentValidatorMap = classTypeToPropValidator.get(parentCtor);
    if (parentValidatorMap) {
      const propNameToValidators = getOrCreateValidatorMap(clsCtor as any as ClassType);
      for (const [propName, parentValidators] of parentValidatorMap) {
        if (propNameToValidators.has(propName) === false) {
          propNameToValidators.set(propName, parentValidators);
        }
      }
    }

    // register the current class constructor to the classSet
    classSet.add(clsCtor as any as ClassType);
    // console.log(`${clsCtor.name}`);

    // Explanation about not using recursion when registering parent class properties:
    // because the parent class must have completed the registration before the child class,
    // there is no need to use recursion to register the parent class's parent class's properties.
  };
}

/**
 * Prop creates a @Prop decorator that registers a class property,
 * any property not registered with @Prop will be ignored when converting a raw JSON object to an instance of the class registered with @Class.
 * @Prop allows you to specify the type of the property, whether it is optional, the default value, and the validation function.
 *
 * Usage:
 * mark a primitive type: @Prop({ type: PrimitiveType.Int });
 * mark a class: @Prop({ type: WheelConfig });
 * mark an array: @Prop({ type: [WheelConfig] });
 * mark an plain object: @Prop({ type: Object });
 * mark as optional property: @Prop({ type: PrimitiveType.Int, isOptional: true });
 * set default value: @Prop({ type: PrimitiveType.String, default: '' });
 * set built-in validator: @Prop({ type: PrimitiveType.Int, validate: NewValidatorMin(0) });
 * set custom validator: @Prop({ type: PrimitiveType.Int, validate: (v) => v >= 0 ? undefined : 'v must >= 0' });
 */
export function Prop(options: {
  /** type that the property will be converted to */
  type: Type;
  /** allow the property missing in the original JSON object when isOptional is true */
  isOptional?: boolean;
  /** value applied when the property is missing in the original JSON object. (Note: when default is set, isOptional is forced to be true) */
  default?: any;
  /** validation function(s) for the property */
  validate?: PropValidator | PropValidator[];
}): PropertyDecorator {
  return (obj: Object, propName: string | symbol): void => {
    // Extra check for ArrayType, throw an error if the array has more than one element.
    if (Array.isArray(options.type) && options.type.length !== 1) {
      throw new Error(`ArrayType must have only one element, actual options.type:${options.type}`);
    }

    const currentMetadata: PropMetadata = {
      name: propName.toString(), // Attention: not support Symbol type, convert it to string type for the purpose of passing the compilation.
      type: options.type,
      isOptional: options.default !== undefined ? true : options.isOptional === true, // Attention: any default value other than undefined (null is also a value) will force isOptional to be true.
      default: options.default,
    };

    // register the current property metadata,
    // Attention: even if the metadata already exists for the same property name,
    // it will be forcibly overridden, because the same property name of the subclass will override the same property name of the parent class.
    const clsCtor = obj.constructor as ClassType;
    getOrCreateMetadataMap(clsCtor).set(currentMetadata.name, currentMetadata);
    // console.log(`${clsCtor.name}.${currentMetadata.propertyKey}`);

    // register the current property validator,
    // Attention: parent class's PropValidator[] on the same property name will be overridden by the subclass's PropValidator[].
    let propValidators: PropValidator[] = [];
    if (options.validate) {
      propValidators = Array.isArray(options.validate) ? options.validate : [options.validate];
    }
    if (propValidators.length > 0) {
      getOrCreateValidatorMap(clsCtor).set(currentMetadata.name, propValidators);
    } else {
      getOrCreateValidatorMap(clsCtor).delete(currentMetadata.name); // delete to save memory
    }
  };
}
