import { convertToType, PrimitiveType, NewValidatorMin, NewValidatorMax, Class, Prop } from './index';

const json = {
  userId: 123456,
};

@Class()
class Schema {
  @Prop({ type: PrimitiveType.Int })
  userId: number;
}

describe('convertValueToType', () => {
  it('should ok', () => {
    const dto: Schema = convertToType(json, Schema);
    expect(dto.userId).toBe(123456);
  });

  //   it('should convert an integer value to the specified type', () => {
  //     const sourceValue = 10;
  //     const toType = PrimitiveType.Float;
  //     const result = convertValueToType({ sourceValue, toType });
  //     expect(result).toBe(10.0);
  //   });
  //   it('should convert a string value to the specified type', () => {
  //     const sourceValue = 'true';
  //     const toType = PrimitiveType.Boolean;
  //     const result = convertValueToType({ sourceValue, toType });
  //     expect(result).toBe(true);
  //   });
  //   it('should throw an error when the source value is undefined', () => {
  //     const sourceValue = undefined;
  //     const toType = PrimitiveType.String;
  //     expect(() => convertValueToType({ sourceValue, toType })).toThrowError(
  //       'Invalid source value'
  //     );
  //   });
  //   it('should throw an error when the source value cannot be converted to the specified type', () => {
  //     const sourceValue = 'abc';
  //     const toType = PrimitiveType.Int;
  //     expect(() => convertValueToType({ sourceValue, toType })).toThrowError(
  //       'Invalid source value'
  //     );
  //   });
});

// describe('NewValidatorMin', () => {
//   it('should return undefined when the value is greater than or equal to the minimum', () => {
//     const value = 10;
//     const min = 5;
//     const validator = NewValidatorMin(min);
//     const result = validator(value, 'test', {});
//     expect(result).toBeUndefined();
//   });

//   it('should return an error message when the value is less than the minimum', () => {
//     const value = 3;
//     const min = 5;
//     const validator = NewValidatorMin(min);
//     const result = validator(value, 'test', {});
//     expect(result).toBe('test must be greater than or equal to 5');
//   });
// });

// describe('NewValidatorMax', () => {
//   it('should return undefined when the value is less than or equal to the maximum', () => {
//     const value = 10;
//     const max = 15;
//     const validator = NewValidatorMax(max);
//     const result = validator(value, 'test', {});
//     expect(result).toBeUndefined();
//   });

//   it('should return an error message when the value is greater than the maximum', () => {
//     const value = 20;
//     const max = 15;
//     const validator = NewValidatorMax(max);
//     const result = validator(value, 'test', {});
//     expect(result).toBe('test must be less than or equal to 15');
//   });
// });
