/*
 * classes 是一个集合，存储着所有用 @Class 装饰器注册的自定义类的构造函数。
 */
const classes: Set<ClassType> = new Set();

/**
 * propMetadataByClassType 是一个字典，key = 自定义类的构造函数，value = 对应类通过 @dto.Prop 注册的所有属性的元数据按照属性名索引的字典。
 */
const propMetadataByClassType: Map<
  ClassType,
  Map<string, PropMetadata>
> = new Map();

/**
 * propValidatorByClassType 是一个字典，key = 自定义类的构造函数，value = 对应类通过 @dto.Prop 注册的所有属性的 PropValidator 按照属性名索引的字典。
 * 注意：单个属性支持 1-N 个 PropValidator。
 */
const propValidatorByClassType: Map<
  ClassType,
  Map<string, PropValidator[]>
> = new Map();

/**
 * Type 是 convertValueToType 函数支持转化的所有目标类型的组合，
 * 可以是一个 PrimitiveType，
 * 可以是一个可以包含同种 Type 的 ArrayType，
 * 可以是一个通过 @dto.Class 装饰器注册的类的构造函数，
 * 可以是一个多语言专用的 TextByLocalType 类，
 * 可以是一个普通的 Object 对象类型。
 */
type Type = PrimitiveType | ArrayType | ClassType | Date | Object;

/**
 * ArrayType 是一个可以包含同种 Type 的数组类型的定义，数组长度必须为1。
 */
type ArrayType = { 0: Type };

/**
 * ClassType 是使用 @dto.Class 装饰器注册的自定义类的构造函数的类型的别名。
 */
type ClassType = Function;

/**
 * PrimitiveType 是 convertValueToType 函数支持转化的所有基础类型的定义。
 */
export enum PrimitiveType {
  Int,
  Float,
  String,
  Boolean,
}

/**
 * PropMetadata 记录着通过 @dto.Prop 装饰器注册的属性的元数据，
 * 这些元数据将被 convertValueToType 函数用于将原始值转化为属性需要的正确的类型。
 */
type PropMetadata = {
  propertyKey: string; // 自定义类中的对应属性的名称
  type: Type; // 定义属性的类型
  isOptional: boolean; // 是否允许该属性的值在原始数据中不存在
  default?: any; // 原始数据中不存在该属性时，初始化为该默认值（注意：设置了该值的属性，isOptional 强制等于 true）
};

/**
 * PropOptions 是 @dto.Prop 装饰器的参数。
 */
type PropOptions = {
  type: Type;
  isOptional?: boolean;
  default?: any;
  validate?: PropValidator | PropValidator[];
};

/**
 * PropValidator 是对某个对象的某个属性的值进行自定义校验的函数的签名。
 * @param {any} value - 属性的值
 * @param {string} key - 属性在目标对象中的字段名
 * @param {Object} target - 包含该属性的目标对象
 * @returns {string | undefined} - 当校验成功时，请返回 undefined；当校验失败时，请返回失败原因的字符串文本。
 */
export type PropValidator = (
  value: any,
  key: string,
  target: Object
) => string | undefined;

/**
 * Prop 是一个类的属性装饰器，用于记录类中的某个属性的数据类型、是否是可选字段等信息，
 * 这些信息被 convertValueToType 函数用于提取原始 JSON 对象中的原始值，并进行类型转换、数据校验以确保类属性的类型安全。
 * 用法：
 * 标记一个基础类型：@dto.Prop({ type: dto.PrimitiveType.Int })；
 * 标记一个类：@dto.Prop({ type: WheelConfig })；
 * 标记一个数组：@dto.Prop({ type: [dto.PrimitiveType.Int] })；
 * 标记一个普通对象：@dto.Prop({ type: Object })；
 * 标记为可选属性：@dto.Prop({ type: dto.PrimitiveType.Int, isOptional: true })；
 * 设置默认值：@dto.Prop({ type: dto.PrimitiveType.String, default: '' })；
 * 设置自定义的校验函数：@dto.Prop({ type: dto.PrimitiveType.Int, validate: (v) => v >= 0 ? undefined : 'v must >= 0' })；
 * @param {Type} options.type - 定义该属性的数据类型。
 * @param {boolean | undefined} [options.isOptional=undefined] -【可选参数】isOptional=true时，当该属性在原始 JSON 对象中不存在时，在当前类中也不会被初始化。
 * @param {any | undefined} [options.default=undefined] -【可选参数】当该属性在原始 JSON 对象中不存在时，使用该值作为默认值。（注意：设置了 default 值的属性，isOptional 强制等于 true）
 * @param {PropValidator | PropValidator[] | undefined} [options.validate=undefined] -【可选参数】对该属性添加自定义的一到多个校验函数，当校验成功时，请返回 undefined；当校验失败时，请返回失败原因的字符串文本。（注意：属性会先执行转换，再进行校验）
 */
export function Prop(options: PropOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    // 注意：检查数组类型的定义，长度必须为1
    if (Array.isArray(options.type) && options.type.length !== 1) {
      throw new Error(
        `ArrayType must have only one element, actual options.type=${options.type}`
      );
    }

    const currentMetadata: PropMetadata = {
      propertyKey: propertyKey.toString(), // 注意：不支持使用 symbol 作为 class 的 key，所以此处强制将 symbol 转化为 string 只是为了编译能够通过。
      type: options.type,
      isOptional:
        options.default !== undefined ? true : options.isOptional === true, // 注意：只要不是 undefined，都视为设置了默认值（null也是有效的默认值），此时该属性一定是可选的，因为当对应值不存在时，可以使用默认值。
      default: options.default,
    };

    // 存储当前属性的元数据到 metadataByPropertyKey 中，
    // 注意：此时即便 metadataByPropertyKey 已经存在了同名属性的元数据，也会强行覆盖掉，因为子类的同名属性会覆盖父类的同名属性。
    const clsCtor: ClassType = target.constructor;
    getOrCreateMetadataMap(clsCtor).set(
      currentMetadata.propertyKey,
      currentMetadata
    );
    // console.log(`${clsCtor.name}.${currentMetadata.propertyKey}`);

    // 存储当前属性自定义的校验函数到 validatorByPropertyKey 中，
    // 注意：父类的 PropValidator[] 会被子类的 PropValidator[] 强行覆盖掉。
    let propValidatorList: PropValidator[] = [];
    if (options.validate) {
      propValidatorList = Array.isArray(options.validate)
        ? options.validate
        : [options.validate];
    }
    if (propValidatorList.length > 0) {
      getOrCreateValidatorMap(clsCtor).set(
        currentMetadata.propertyKey,
        propValidatorList
      );
    } else {
      getOrCreateValidatorMap(clsCtor).delete(currentMetadata.propertyKey);
    }
  };
}

/**
 * Class 是一个类装饰器，用于注册一个类到 classes 集合中，
 * 当该类的父类存在已注册的属性时，会将父类的属性注册到当前类的属性字典中，
 * 因为父类一定是先于子类完成了所有属性的注册，因此父类也一定已经注册了该父类的父类的所有属性，因此无需使用递归。
 * 已注册的类在 CmsService 和 ClientAPIController 中会使用 convertValueToType 而不是 class-transformer 进行实例化。
 */
export function Class(): ClassDecorator {
  return (clsCtor) => {
    // 获取父类的构造函数
    const parentCtor = Object.getPrototypeOf(clsCtor);

    // 继承父类的属性字典
    const parentMetadataMap = propMetadataByClassType.get(parentCtor);
    if (parentMetadataMap) {
      const metadataByPropertyKey = getOrCreateMetadataMap(clsCtor);
      for (const parentMetadata of parentMetadataMap.values()) {
        // 注意：如果子类中已经注册过同名的属性，那么放弃父类注册的同名属性，因为子类优先覆盖父类的同名属性。
        if (metadataByPropertyKey.has(parentMetadata.propertyKey) === false) {
          metadataByPropertyKey.set(parentMetadata.propertyKey, parentMetadata);
          // console.log(`${clsCtor.name}.${parentMetadata.propertyKey} -> ${parentCtor.name}`);
        }
      }
    }

    // 继承父类的校验函数
    const parentValidatorMap = propValidatorByClassType.get(parentCtor);
    if (parentValidatorMap) {
      const validatorByPropertyKey = getOrCreateValidatorMap(clsCtor);
      for (const [propertyKey, parentValidatorList] of parentValidatorMap) {
        // 注意：如果子类中已经注册过校验函数，那么放弃父类的校验函数。
        if (validatorByPropertyKey.has(propertyKey) === false) {
          validatorByPropertyKey.set(propertyKey, parentValidatorList);
        }
      }
    }

    // 注册当前类
    classes.add(clsCtor);
    // console.log(`${clsCtor.name}`);
  };
}

/**
 * isClassRegistered 当传入的类型已通过 @dto.Class 注册过时，会返回 true。
 */
export function isClassRegistered(clsCtor: ClassType): boolean {
  return classes.has(clsCtor);
}

/**
 * getOrCreateMetadataMap 根据类的构造函数，返回或创建并返回该类的属性元数据字典。
 */
function getOrCreateMetadataMap(clsCtor: ClassType): Map<string, PropMetadata> {
  let metadataByPropertyKey = propMetadataByClassType.get(clsCtor);
  if (metadataByPropertyKey == undefined) {
    metadataByPropertyKey = new Map<string, PropMetadata>();
    propMetadataByClassType.set(clsCtor, metadataByPropertyKey);
  }
  return metadataByPropertyKey;
}

/**
 * getOrCreateValidatorMap 根据类的构造函数，返回或创建并返回该类的所有验证函数的数组。
 */
function getOrCreateValidatorMap(
  clsCtor: ClassType
): Map<string, PropValidator[]> {
  let validatorByPropertyKey = propValidatorByClassType.get(clsCtor);
  if (validatorByPropertyKey == undefined) {
    validatorByPropertyKey = new Map<string, PropValidator[]>();
    propValidatorByClassType.set(clsCtor, validatorByPropertyKey);
  }
  return validatorByPropertyKey;
}

/**
 * convertValueToType 将传入的 sourceValue 转化为 toType 对应的类型并返回转化后的值，
 * 当传入的 sourceValue 为 undefined | null，或者传入不支持的 toType，或者 sourceValue 无法转化为有效的 toType 时，均会抛出异常。
 * 该函数比 class-transformer 库的 plainToClass 能提供约 50 倍的性能提升，
 * 例如：farm-chick-reward-group，700ms(plainToClass) -> 14ms(convertValueToType)。
 * @param {any} options.sourceValue - 原始值
 * @param {Type} options.toType - 转化的目标类型
 * @param {string | undefined} [options.toLocale=undefined] - 是否对多语言字段进行翻译，当传入非空字符串时才会执行
 */
export function convertValueToType(options: {
  sourceValue: any;
  toType: Type;
  toLocale?: string; // 注意：convertValueToType 中如果递归调用了 convertValueToType，那么每一层的 convertValueToType 函数需要使用同样的 toLocale 参数，确保翻译的结果针对同一个用户是一致的
}): any {
  const sourceType = typeof options.sourceValue;

  let targetValue: any;

  switch (options.toType) {
    case PrimitiveType.Int: {
      targetValue =
        sourceType === 'number'
          ? options.sourceValue
          : parseFloat(options.sourceValue);
      if (
        isNaN(targetValue) ||
        targetValue % 1 !== 0 // 当有小数部分时，余数不为0
      ) {
        throw new Error(
          `convert to PrimitiveType.Int fail, targetValue=${targetValue} is not Integer, sourceValue=${options.sourceValue}`
        );
      }
      break;
    }
    case PrimitiveType.Float: {
      targetValue =
        sourceType === 'number'
          ? options.sourceValue
          : parseFloat(options.sourceValue);
      if (isNaN(targetValue)) {
        throw new Error(
          `convert to PrimitiveType.Float fail, targetValue=${targetValue} is not Float, sourceValue=${options.sourceValue}`
        );
      }
      break;
    }
    case PrimitiveType.String: {
      if (sourceType === 'string') {
        targetValue = options.sourceValue;
      } else if (sourceType === 'number') {
        targetValue = '' + options.sourceValue;
      } else {
        throw new Error(
          `convert to PrimitiveType.String fail, sourceValue=${options.sourceValue} is neither typeof 'string' nor 'number'`
        );
      }
      break;
    }
    case PrimitiveType.Boolean: {
      if (sourceType === 'boolean') {
        targetValue = options.sourceValue;
      } else if (options.sourceValue === 'true') {
        targetValue = true;
      } else if (options.sourceValue === 'false') {
        targetValue = false;
      } else {
        throw new Error(
          `convert to PrimitiveType.Boolean fail, sourceValue=${options.sourceValue} is neither typeof 'boolean' nor typeof 'string' of value 'false' | 'true'`
        );
      }
      break;
    }
    case Date: {
      targetValue = new Date(options.sourceValue);
      if (isNaN(targetValue.getTime())) {
        throw new Error(
          `convert to Date fail, targetValue=${targetValue} is not Date, sourceValue=${options.sourceValue}`
        );
      }
      break;
    }
    case Object: {
      if (sourceType !== 'object') {
        throw new Error(
          `convert to Object fail, typeof sourceValue=${options.sourceValue} must be typeof 'object'`
        );
      }
      // 当是一个普通对象类型时，直接使用原始值作为目标值，无需进行任何转换
      targetValue = options.sourceValue;
      break;
    }
    default: {
      if (isClassRegistered(options.toType as ClassType)) {
        // 当 toType 是另一个 Class 时，
        // 当 sourceValue 不是一个 object 时会抛出异常，
        // 当 sourceValue 是一个空对象时，targetValue 会被设置为 null，
        // targetValue 会被实例化为一个对象，并根据 @dto.Prop 注册的属性列表初始化对象中的属性。
        if (sourceType !== 'object') {
          throw new Error(
            `convert to ${
              (options.toType as ClassType).name
            } fail, typeof sourceValue=${
              options.sourceValue
            } must be typeof 'object'`
          );
        }

        if (options.sourceValue === null) {
          // 注意：sourceValue 为空对象时，说明想要将该对象初始化为 null
          targetValue = null;
        } else {
          // 初始化为一个空对象（没必要初始化对应的类，因为实际的 dto 类并不包含具体的方法，因此使用一个简单的对象就足够了）
          // 注意：允许未通过 @dto.Prop 定义任何属性的类，未定义任何属性时，不会报错，而是直接返回这个空对象。
          targetValue = {};

          let propValue: any;
          const metadataByPropertyKey = propMetadataByClassType.get(
            options.toType as ClassType
          );
          if (metadataByPropertyKey) {
            for (const propMetadata of metadataByPropertyKey.values()) {
              propValue = options.sourceValue[propMetadata.propertyKey];

              // undefined ｜ null 时，均启用默认值
              if (propValue == undefined) {
                propValue = propMetadata.default;

                // 使用默认值后，仍然为 undefined | null
                if (propValue == undefined) {
                  // 该属性必须有值时，无论是 null 还是 undefined，均应该抛出异常
                  if (propMetadata.isOptional === false) {
                    throw new Error(
                      `${(options.toType as ClassType).name}.${
                        propMetadata.propertyKey
                      } is required`
                    );
                  }

                  // 该属性可选时，并且属性的值仅为 undefined（注意：不包括 null）时应该放行，不初始化该属性
                  if (propValue === undefined) {
                    continue;
                  }

                  // 代码走到这里，propValue == null
                }

                // 代码走到这里，propValue == null | 其它值
              }

              // 代码走到这里，propValue 可能是 null | 其它值
              // 此时将 propValue 的值交给 convertValueToType 函数将其转化为对应的 propMetadata.type，
              // 如果 propValue 的值被人为设置成了 null，那么：
              //   convertValueToType 可能会抛出异常（例如：对 Int 值设置了 null），
              //   也可能会成功设置为 null（例如：将一个 ClassType 类型的属性设置成 null）。
              // 因为此时已经通过了必要字段的检查，如果 convertValueToType 返回 null，说明该值允许设置成 null。
              targetValue[propMetadata.propertyKey] = convertValueToType({
                sourceValue: propValue,
                toType: propMetadata.type,
                toLocale: options.toLocale,
              });
            }
          }

          // 在一个对象的所有属性都初始化完成后，再统一进行校验（这样做是因为有些属性的校验依赖于其它属性的值），
          // 校验失败时会抛出异常。
          let validatorList: PropValidator[] | undefined;
          let propertyKey: string;
          let validate: PropValidator;
          let errMsg: string | undefined;
          const validatorByPropertyKey = propValidatorByClassType.get(
            options.toType as ClassType
          );
          if (validatorByPropertyKey) {
            for (propertyKey of validatorByPropertyKey.keys()) {
              validatorList = validatorByPropertyKey.get(propertyKey);
              if (validatorList) {
                propValue = targetValue[propertyKey];
                // 注意：只有在属性的值存在的时候才需要进行校验，不存在值的属性都是可选属性，不需要执行校验
                if (propValue !== undefined) {
                  for (validate of validatorList) {
                    errMsg = validate(propValue, propertyKey, targetValue);
                    if (!!errMsg) {
                      throw new Error(
                        `validate ${
                          (options.toType as ClassType).name
                        }.${propertyKey} fail, propValue=${
                          typeof propValue === 'object'
                            ? JSON.stringify(propValue)
                            : propValue
                        }, errMsg=${errMsg}`
                      );
                    }
                  }
                }
              }
            }
          }
        }
      } else if (Array.isArray(options.toType)) {
        // 当 toType 是一个 ArrayType 类型时，
        // toType 中定义的元素数组长度必须为1，否则会抛出异常，
        // sourceValue 必须也是一个数组类型，否则会抛出异常，
        // targetValue 会被实例化为一个数组，
        // 然后实例化数组中的每一个元素
        if (options.toType.length !== 1) {
          throw new Error(
            `ArrayType must have only one element, actual toType=${options.toType}`
          );
        }
        if (Array.isArray(options.sourceValue)) {
          const sourceLen = options.sourceValue.length;
          const arrayElementType = options.toType[0];
          let i: number;
          // 注意：使用预分配数组长度的方式是性能最好的，相比 Array.push 性能要好。
          targetValue = new Array(sourceLen);
          for (i = 0; i < sourceLen; i++) {
            targetValue[i] = convertValueToType({
              sourceValue: options.sourceValue[i],
              toType: arrayElementType,
              toLocale: options.toLocale,
            });
          }
        } else if (options.sourceValue === null) {
          // 注意：sourceValue 为空对象时，说明想要将该数组设置为 null
          targetValue = null;
        } else {
          throw new Error(
            `sourceValue must be Array, actual sourceValue=${options.sourceValue}`
          );
        }
      } else {
        // 不允许出现未实现的 toType，直接抛出异常
        throw new Error(`toType=${options.toType} is not implemented`);
      }
      break;
    }
  }

  // 转化完成后，目标值不应该为一个 undefined，直接抛出异常
  // 注意：目标值允许为 null。
  if (targetValue === undefined) {
    throw new Error(
      `convert sourceValue=${options.sourceValue} to toType=${options.toType} fail, targetValue should not be undefined`
    );
  }

  return targetValue;
}

/**
 * NewValidatorMin 创建一个 PropValidator，用于校验目标值 v >= min 指定的值。
 */
export function NewValidatorMin(min: number): PropValidator {
  return (value) =>
    value >= min
      ? undefined
      : `validate min fail, expect value=${value} >= min=${min}`;
}

/**
 * NewValidatorMax 创建一个 PropValidator，用于校验目标值 v <= max 指定的值，当校验失败时，将会返回 errMsg 对应的错误信息。
 */
export function NewValidatorMax(max: number): PropValidator {
  return (value) =>
    value <= max
      ? undefined
      : `validate max fail, expect value=${value} <= max=${max}`;
}

/**
 * NewValidatorMinMax 创建一个 PropValidator，用于校验目标值 min <= v <= max 指定的值。
 */
export function NewValidatorMinMax(min: number, max: number): PropValidator {
  if (max < min) {
    throw new Error(
      `NewValidatorMinMax() fail, max=${max} must >= min=${min}'`
    );
  }
  return (value) =>
    min <= value && value <= max
      ? undefined
      : `validate min max fail, expect value=${value} in range [${min}, ${max}]`;
}

/**
 * NewValidatorEnumValueExist 创建一个 PropValidator，用于校验目标值 v 是否存在于传入的 enumDefine 枚举值中。
 * 注意：不支持字符串类型的枚举值，因为字符串类型的枚举，编译成 js 后不会生成按照值进行索引的字段。
 */
export function NewValidatorEnumValueExist(enumDefine: {
  [key: string]: string | number;
}): PropValidator {
  return (value) =>
    enumDefine[value] != undefined
      ? undefined
      : `validate enum value exist fail, expect value=${value} exist in enum ${JSON.stringify(
          enumDefine
        )}`;
}

/**
 * NewValidatorStringNotEmpty 创建一个 PropValidator，用于校验目标值 v 不能是一个空字符串，
 * @param options.trim - 当传入 true 时，会先对校验目标值进行去除首尾空白字符的处理，然后再判断是否是一个空字符串。注意：该操作会修改原始值。
 */
export function NewValidatorStringNotEmpty(options?: {
  trim?: boolean;
  maxLength?: number;
  minLength?: number;
}): PropValidator {
  return (value, key, target: { [key: string]: any }) => {
    if (options) {
      if (options.trim) {
        value = ('' + value).trim();
        target[key] = value;
      }
      if (options.maxLength && value && value.length > options.maxLength) {
        return `validate string max length fail, expect ${key}.length=${value.length} <= ${options.maxLength}`;
      }
      if (options.minLength && value && value.length < options.minLength) {
        return `validate string min length fail, expect ${key}.length=${value.length} >= ${options.minLength}`;
      }
    }
    return value && value.length > 0
      ? undefined
      : `validate string not empty fail, expect ${key}.length > 0`;
  };
}

/**
 * NewValidatorArrayNotEmpty 创建一个 PropValidator，用于校验目标值 v 不能是一个空数组。
 */
export function NewValidatorArrayNotEmpty(): PropValidator {
  return (value, key) =>
    value && value.length > 0
      ? undefined
      : `validate array not empty fail, expect ${key}.length > 0`;
}
