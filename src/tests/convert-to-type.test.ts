import { convertToType } from '../converters';

describe('convertToType', () => {
  it('should convert a raw JSON object to an instance of the class registered with @Class', async () => {
    const json = await import('./convert-to-type.json');
    const { Character, Friend, Relationship, WeaponType } = await import('./convert-to-type.dto');

    const character = convertToType(json, Character);
    // console.log(JSON.stringify(character, null, 2));

    // prettier-ignore
    const equalProps = [
      'id', 'name', 'height', 'online', 'fullLevel', 
      'skills', 'summon', 'magic',
    ];
    equalProps.forEach((propName) => expect((character as any)[propName]).toEqual((json as any)[propName]));

    // prettier-ignore
    const stringValueEqualProps = ['age', 'weight', 'inTeam', 'leader', 'level'];
    stringValueEqualProps.forEach((propName) =>
      expect('' + (character as any)[propName]).toEqual('' + (json as any)[propName]),
    );

    // age and weight should be converted to Number
    expect(typeof character.age).toBe('number');
    expect(typeof character.weight).toBe('number');

    // nickname is not registered with @Prop, so it should not be in the character instance
    expect(json).toHaveProperty('nickname');
    expect(character).not.toHaveProperty('nickname');

    // test friends
    // console.log('friends', JSON.stringify(character.friends, null, 2));
    // all properties of friends defined in json should exist in character.friends
    expect(character.friends).toMatchObject(json.friends);
    character.friends.forEach((friend) => {
      // friend should inherit the prototype of Friend class and have isLover method
      expect(friend.isLover).toEqual(Friend.prototype.isLover);
      // isLover should return true if the friend's friends list contains the character's id
      expect(friend.isLover(character.id)).toBe(
        friend.friends.findIndex((f) => f.id == character.id && f.relationship == Relationship.LOVER) !== -1,
      );
      // Friend's friends children should be instances of Friend class
      friend.friends.forEach((f) => expect(Array.isArray(f.friends)).toBeTruthy());
    });

    // test limitBreak
    expect(character.limitBreak.effect).toBe(json.limitBreak.effect.trim());
    expect(character.limitBreak.levels).toEqual(json.limitBreak.levels);

    // test equipment
    // console.log({ equipment: character.equipment });
    // all properties of equipment defined in json should exist in character.equipment
    expect(character.equipment).toMatchObject(json.equipment);
    // weapon, amor, accessory should contain type property which is defined in Character class but not in json
    expect(character.equipment.weapon.type).toBe(WeaponType.Weapon);
    expect(character.equipment.armor.type).toBe(WeaponType.Armor);
    expect(character.equipment.accessory.type).toBe(WeaponType.Accessory);

    // birthday and registered should be converted to Date
    expect(character.birthday).toEqual(new Date(json.birthday));
    expect(character.registered).toEqual(new Date(json.registered));

    // test addresses
    expect(character.addresses).toMatchObject(json.addresses);
    json.addresses.forEach((addressInJSON, i) => {
      const addressInCharacter = character.addresses[i];
      expect(addressInCharacter).toBeDefined();
      // street should be in the character instance even if it is not defined in json
      expect(addressInCharacter.street).toBeDefined();

      if (addressInJSON.zip) {
        // optional property zip should be in the character instance when it is defined in json
        expect(addressInCharacter.zip).toBe(addressInJSON.zip);
      } else {
        // optional property zip should not be in the character instance when it is not defined in json
        expect(addressInCharacter).not.toHaveProperty('zip');
      }
    });
  });
});
