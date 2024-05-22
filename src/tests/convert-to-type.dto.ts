import { Class, Prop } from '../decorators';
import { PrimitiveType } from '../types';
import {
  NewValidatorMin,
  NewValidatorMinMax,
  NewValidatorStringNotEmpty,
  NewValidatorEnumValueExist,
  NewValidatorArrayNotEmpty,
  NewValidatorMax,
} from '../validators';

export enum Relationship {
  TEAMMATE = 1,
  LOVER = 2,
}

@Class()
export class Friend {
  @Prop({ type: PrimitiveType.Int })
  id: number;

  @Prop({ type: PrimitiveType.String, validate: NewValidatorStringNotEmpty() })
  name: string;

  @Prop({ type: PrimitiveType.Int, validate: NewValidatorEnumValueExist(Relationship) })
  relationship: Relationship;

  @Prop({ type: [Friend], default: [] })
  friends: Friend[];

  isLover(characterId: number): boolean {
    return (
      characterId != this.id &&
      this.friends.findIndex((f) => f.id === characterId && f.relationship === Relationship.LOVER) > -1
    );
  }
}

@Class()
class LimitBreakLevel {
  @Prop({ type: PrimitiveType.Int, validate: NewValidatorMinMax(1, 7) })
  level: number;

  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.Int })
  damage: number;
}

@Class()
class LimitBreak {
  @Prop({ type: PrimitiveType.String, validate: NewValidatorStringNotEmpty({ trim: true, min: 1, max: 9999 }) })
  effect: string;

  @Prop({ type: [LimitBreakLevel] })
  levels: LimitBreakLevel[];
}

export enum WeaponType {
  Weapon = 'Weapon',
  Armor = 'Armor',
  Accessory = 'Accessory',
}

@Class()
class BaseEquipment {
  @Prop({ type: PrimitiveType.String })
  name: string;

  @Prop({ type: PrimitiveType.String, validate: NewValidatorStringNotEmpty() })
  type: string;

  getType(): WeaponType {
    throw new Error('Method not implemented.');
  }
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
  /**
   * 1. Properties with same name in parent class will be overridden by the child class.
   * 2. Validators defined in parent class will be inherited by the child class.
   * 3. Never use assignment to set default value in the property declaration, use @Prop({ default: 'Weapon' }) instead.
   * 4. Validate against a string enum is not supported, so you can not use validate: NewValidatorEnumValueExist(WeaponType) here.
   */
  @Prop({ type: PrimitiveType.String, default: WeaponType.Weapon /** validate is inherited */ })
  type: WeaponType;

  getType(): WeaponType {
    return this.type;
  }
}

@Class()
class Armor extends DefensiveEquipment {
  @Prop({ type: PrimitiveType.String, default: WeaponType.Armor })
  type: WeaponType;
}

@Class()
class Accessory extends DefensiveEquipment {
  @Prop({ type: PrimitiveType.String, default: WeaponType.Accessory })
  type: WeaponType;

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

@Class()
class Address {
  @Prop({ type: PrimitiveType.String, default: '' })
  street: string;

  @Prop({ type: PrimitiveType.String })
  city: string;

  @Prop({ type: PrimitiveType.String, isOptional: true })
  zip?: string;
}

@Class()
export class Character {
  @Prop({ type: PrimitiveType.Int, validate: [NewValidatorMin(1), NewValidatorMax(9999)] })
  id: number;

  @Prop({ type: PrimitiveType.String, validate: NewValidatorStringNotEmpty() })
  name: string;

  @Prop({ type: PrimitiveType.Int })
  age: number;

  @Prop({ type: PrimitiveType.Float })
  height: number;

  @Prop({ type: PrimitiveType.Float })
  weight: number;

  @Prop({ type: PrimitiveType.Boolean })
  online: boolean;

  @Prop({ type: PrimitiveType.Boolean })
  inTeam: boolean;

  @Prop({ type: PrimitiveType.Boolean })
  leader: boolean;

  @Prop({ type: PrimitiveType.Boolean })
  fullLevel: boolean;

  @Prop({ type: PrimitiveType.String })
  level: string;

  @Prop({ type: [PrimitiveType.String], validate: NewValidatorArrayNotEmpty() })
  skills: string[];

  @Prop({ type: [[PrimitiveType.String]] })
  summon: string[][];

  @Prop({ type: [Friend] })
  friends: Friend[];

  @Prop({ type: LimitBreak })
  limitBreak: LimitBreak;

  @Prop({ type: Equipment })
  equipment: Equipment;

  @Prop({ type: Date })
  birthday: Date;

  /** Custom validator: registered must be later than birthday */
  @Prop({
    type: Date,
    validate: (val, name, obj) =>
      val.getTime() >= obj['birthday'].getTime() ? undefined : 'registered must be later than birthday',
  })
  registered: Date;

  @Prop({ type: [Address] })
  addresses: Address[];

  @Prop({ type: Object })
  magic?: Record<string, number>;
}
