# json-to-dto

`json-to-dto` is a TypeScript library designed for efficiently transforming JSON objects into predefined classes annotated with `@Class` and `@Prop` decorators.

During the conversion, it can discard properties not marked with `@Prop`, perform type conversion and validation on the marked properties, and set default values for missing properties.

## Why json-to-dto?

In game development, business logic often involves processing large amounts of interconnected player data and configuration data in memory. Player data from the database needs to be combined for transmission to the client. Configuration data from CMS and Excel spreadsheets must be validated, combined, with sensitive fields removed before sending to the client.

Unlike the class-transformer library, which relies on reflection and can be slower due to the overhead of metadata processing, json-to-dto uses a straightforward approach to convert JSON into class instances, saving CPU resources and reducing server costs.

Directly defining methods on DTO classes (similar to the Active Record pattern) simplifies writing business logic. Sharing DTO model code with the client makes backend data models usable on the frontend out of the box, saving significant development time.

## Installation

```sh
npm install json-to-dto
```

## Usage

### Simple Conversion

To convert a simple JSON object into a class instance:

```typescript
import { convertToType, Class, Prop, PrimitiveType } from 'json-to-dto';

const json = {
  id: 1,
  name: 'Tifa Lockhart',
  age: 20,
  height: 1.67,
  weight: '52.16',
  birthday: '1987-05-03T07:00:00.000Z',
  skills: ['hand-to-hand combat', 'martial arts', 'limit break'],
  online: true,
};

@Class()
class Character {
  @Prop({ type: PrimitiveType.Int })
  id: number;

  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.Int })
  age: number;

  @Prop({ type: PrimitiveType.Float })
  height: number;

  // weight will be automatically converted to number
  @Prop({ type: PrimitiveType.Float })
  weight: number;

  @Prop({ type: Date })
  birthday: Date;

  @Prop({ type: [PrimitiveType.String] })
  skills: string[];

  @Prop({ type: PrimitiveType.Boolean })
  online: boolean;
}

const character = convertToType(json, Character);
console.log(character);
// Output:
// Character {
//   id: 1,
//   name: 'Tifa Lockhart',
//   age: 20,
//   height: 1.67,
//   weight: 52.16,
//   birthday: 1987-05-03T07:00:00.000Z,
//   skills: [ 'hand-to-hand combat', 'martial arts', 'limit break' ],
//   online: true
// }
```

### Default and Optional Value

When convert JSON objects into Address instances, the street property will default to an empty string if not provided, and the optional zip property will not be included in the converted instance if undefined in the JSON object.

```typescript
import { convertToType, Class, Prop, PrimitiveType } from 'json-to-dto';

const json = [
  {
    street: '7th Heaven',
    city: 'Midgar',
    zip: '12345',
  },
  {
    city: 'Nibelheim',
  },
];

@Class()
class Address {
  @Prop({ type: PrimitiveType.String, default: '' })
  street: string;

  @Prop({ type: PrimitiveType.String })
  city: string;

  @Prop({ type: PrimitiveType.String, isOptional: true })
  zip?: string;
}

const addresses = convertToType(json, [Address]);
console.log(addresses);
// Output:
// [
//   Address { street: '7th Heaven', city: 'Midgar', zip: '12345' },
//   Address { street: '', city: 'Nibelheim' }
// ]
```

### Nested Objects and Arrays

Handling nested objects and arrays is straightforward. json-to-dto will recursively deserialize nested structures:

```typescript
import { convertToType, Class, Prop, PrimitiveType } from 'json-to-dto';

const json = {
  id: 1,
  name: 'Tifa Lockhart',
  // ... other fields ...
  friends: [
    {
      id: 2,
      name: 'Cloud Strife',
      relationship: 2,
      friends: [
        {
          id: 1,
          name: 'Tifa Lockhart',
          relationship: 2,
        },
        // ... other friends ...
      ],
    },
  ],
  // ... other fields ...
};

enum Relationship {
  TEAMMATE = 1,
  LOVER = 2,
}

@Class()
class Friend {
  @Prop({ type: PrimitiveType.Int })
  id: number;

  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.Int })
  relationship: Relationship;

  @Prop({ type: [Friend], default: [] })
  friends: Friend[];
}

@Class()
class Character {
  @Prop({ type: PrimitiveType.Int })
  id: number;

  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: [Friend] })
  friends: Friend[];
}

const character = convertToType(json, Character);
console.log(character.friends[0].name);
// Output: Cloud Strife
```

### Adding Methods

You can define methods on your DTO classes to include business logic directly within your models:

```typescript
const json = {
  id: 2,
  name: 'Cloud Strife',
  relationship: 2,
  friends: [
    { id: 1, name: 'Tifa Lockhart', relationship: 2 },
    // ... other friends ...
  ],
};

enum Relationship {
  TEAMMATE = 1,
  LOVER = 2,
}

@Class()
class Friend {
  @Prop({ type: PrimitiveType.Int })
  id: number;

  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.Int })
  relationship: Relationship;

  @Prop({ type: [Friend], default: [] })
  friends: Friend[];

  isLover(name: string): boolean {
    return (
      name !== this.name && this.friends.findIndex((f) => f.name === name && f.relationship === Relationship.LOVER) > -1
    );
  }
}

const friend = convertToType(json, Friend);
console.log(friend.isLover('Tifa Lockhart'));
// Output: true
```

### Custom Validation

The custom validation function should follow this signature:

```typescript
/**
 * PropValidator is the function signature for custom validation of a property value of an object.
 * @param value - the value of the property
 * @param name - the name of the property in the object
 * @param obj - the object containing the property
 * @returns - return undefined when validation passes; return a string of the failure reason when validation fails.
 */
export type PropValidator = (val: any, name: string, obj: Record<string, any>) => string | undefined;
```

Example of using custom PropValidator and built-in PropValidator

```typescript
import {
  convertToType,
  Class,
  Prop,
  PrimitiveType,
  NewValidatorMin,
  NewValidatorMax,
  NewValidatorArrayNotEmpty,
  NewValidatorStringNotEmpty,
} from 'json-to-dto';

const json = {
  id: 1,
  name: 'Tifa Lockhart',
  skills: ['hand-to-hand combat', 'martial arts', 'limit break'],
  birthday: '1987-05-03T07:00:00.000Z',
  registered: 547023500000,
};

@Class()
class Character {
  @Prop({ type: PrimitiveType.Int, validate: [NewValidatorMin(1), NewValidatorMax(9999)] })
  id: number;

  @Prop({ type: PrimitiveType.String, validate: NewValidatorStringNotEmpty() })
  name: string;

  @Prop({ type: [PrimitiveType.String], validate: NewValidatorArrayNotEmpty() })
  skills: string[];

  @Prop({ type: Date })
  birthday: Date;

  /** Custom validator: registered must be later than birthday */
  @Prop({
    type: Date,
    validate: (val, name, obj) =>
      val.getTime() >= obj['birthday'].getTime() ? undefined : 'registered must be later than birthday',
  })
  registered: Date;
}

try {
  const character = convertToType(json, Character);
} catch (err) {
  console.error('' + err);
  // Output:
  // Error: failed to convert val([object Object]) to Class(Character), invalid property(registered:Sat May 02 1987 23:58:20 GMT-0700 (Pacific Daylight Time)), validation error(registered must be later than birthday)
}
```

### Inheritance and Polymorphism

Define classes with inheritance to model complex data structures. Here’s how you can use inheritance with json-to-dto:

```typescript
import { convertToType, Class, Prop, PrimitiveType } from 'json-to-dto';

const json = {
  weapon: {
    name: 'Leather Gloves',
    attack: 10,
  },
  armor: {
    name: 'Leather Vest',
    defense: 10,
  },
  accessory: {
    name: 'Protective Boots',
    defense: 5,
    effect: 'Prevents poison',
  },
};

@Class()
class BaseEquipment {
  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.String })
  type: string;
}

@Class()
class OffensiveEquipment extends BaseEquipment {
  @Prop({ type: PrimitiveType.Int })
  attack: number;
}

@Class()
class DefensiveEquipment extends BaseEquipment {
  @Prop({ type: PrimitiveType.Int })
  defense: number;
}

@Class()
class Weapon extends OffensiveEquipment {
  @Prop({ type: PrimitiveType.String, default: 'Weapon' })
  type: string;
}

@Class()
class Armor extends DefensiveEquipment {
  @Prop({ type: PrimitiveType.String, default: 'Armor' })
  type: string;
}

@Class()
class Accessory extends DefensiveEquipment {
  @Prop({ type: PrimitiveType.String, default: 'Accessory' })
  type: string;

  @Prop({ type: PrimitiveType.String })
  effect: string;
}

@Class()
class Equipment {
  @Prop({ type: Weapon })
  weapon: Weapon;

  @Prop({ type: Armor })
  armor: Armor;

  @Prop({ type: Accessory })
  accessory: Accessory;
}

const equipment = convertToType(json, Equipment);
console.log(equipment);
// Output:
// Equipment {
//   weapon: Weapon { type: 'Weapon', attack: 10, name: 'Leather Gloves' },
//   armor: Armor { type: 'Armor', defense: 10, name: 'Leather Vest' },
//   accessory: Accessory {
//     type: 'Accessory',
//     effect: 'Prevents poison',
//     defense: 5,
//     name: 'Protective Boots'
//   }
// }
```

### Explore More Techniques

Please refer to the [src/tests/convert-to-type.dto.ts](https://github.com/ppc-games/json-to-dto/blob/main/src/tests/convert-to-type.dto.ts) file for more advanced usage and techniques.
