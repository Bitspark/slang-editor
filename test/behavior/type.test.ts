import {
	SlangType, SlangTypeJson,
	SlangTypeMap,
	SlangTypeStream,
	SlangTypeValue,
	TypeIdentifier,
} from "../../src/slang/definitions/type";
import isUndefined = SlangTypeValue.isUndefined;
import copy = SlangTypeValue.copy;
import equals = SlangTypeJson.equals;

// tslint:disable:no-magic-numbers

describe("A Slang type", () => {

	it("can be unspecified", () => {
		const type = new SlangType(null, TypeIdentifier.Unspecified);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Unspecified);
		expect(typeCpy.isUnspecified()).toEqual(true);
		expect(typeCpy.isString()).toEqual(false);
		expect(typeCpy.isNumber()).toEqual(false);
		expect(typeCpy.isBoolean()).toEqual(false);
		expect(typeCpy.isBinary()).toEqual(false);
		expect(typeCpy.isPrimitive()).toEqual(false);
		expect(typeCpy.isStream()).toEqual(false);
		expect(typeCpy.isMap()).toEqual(false);
		expect(typeCpy.isGeneric()).toEqual(false);
	});

	it("can be a string", () => {
		const type = new SlangType(null, TypeIdentifier.String);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.String);
		expect(typeCpy.isString()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(true);
	});

	it("can be a number", () => {
		const type = new SlangType(null, TypeIdentifier.Number);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Number);
		expect(typeCpy.isNumber()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(true);
	});

	it("can be a boolean", () => {
		const type = new SlangType(null, TypeIdentifier.Boolean);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Boolean);
		expect(typeCpy.isBoolean()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(true);
	});

	it("can be a binary", () => {
		const type = new SlangType(null, TypeIdentifier.Binary);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Binary);
		expect(typeCpy.isBinary()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(true);
	});

	it("can be a primitive", () => {
		const type = new SlangType(null, TypeIdentifier.Primitive);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Primitive);
		expect(typeCpy.isPrimitive()).toEqual(true);
	});

	it("can be a trigger", () => {
		const type = new SlangType(null, TypeIdentifier.Trigger);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Trigger);
		expect(typeCpy.isTrigger()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(false);
	});

	it("can be a generic", () => {
		const type = new SlangType(null, TypeIdentifier.Generic);
		type.setGenericIdentifier("testType");
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Generic);
		expect(typeCpy.isGeneric()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(false);

		expect(typeCpy.getGenericIdentifier()).toEqual("testType");
		typeCpy.setGenericIdentifier("anotherType");
		expect(typeCpy.getGenericIdentifier()).toEqual("anotherType");
		expect(type.getGenericIdentifier()).toEqual("testType");
	});

	it("can be a stream", () => {
		const type = new SlangType(null, TypeIdentifier.Stream);
		type.setStreamSub(new SlangType(type, TypeIdentifier.String));
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Stream);
		expect(typeCpy.isStream()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(false);

		expect(typeCpy.getStreamSub().isString()).toEqual(true);
		typeCpy.setStreamSub(new SlangType(typeCpy, TypeIdentifier.Number));
		expect(typeCpy.getStreamSub().isNumber()).toEqual(true);
		expect(type.getStreamSub().isString()).toEqual(true);
	});

	it("can be a map", () => {
		const type = new SlangType(null, TypeIdentifier.Map);
		type.addMapSub("a", new SlangType(type, TypeIdentifier.String));
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(typeCpy.isMap()).toEqual(true);
		expect(typeCpy.isPrimitive()).toEqual(false);

		expect(typeCpy.findMapSub("a")!.isString()).toEqual(true);
		typeCpy.addMapSub("a", new SlangType(typeCpy, TypeIdentifier.Number));
		typeCpy.addMapSub("b", new SlangType(typeCpy, TypeIdentifier.String));
		expect(typeCpy.findMapSub("a")!.isNumber()).toEqual(true);
		expect(Array.from(typeCpy.getMapSubs()).length).toEqual(2);
		expect(type.findMapSub("a")!.isString()).toEqual(true);
		expect(Array.from(type.getMapSubs()).length).toEqual(1);
	});

});

describe("SlangTypeValue.isUndefined", () => {

	it("returns true", () => {
		expect(isUndefined(undefined)).toEqual(true);
	});

	it("returns false", () => {
		expect(isUndefined(0)).toEqual(false);
		expect(isUndefined(null)).toEqual(false);
		expect(isUndefined("")).toEqual(false);
		expect(isUndefined(-1)).toEqual(false);
		expect(isUndefined("test")).toEqual(false);
		expect(isUndefined(123)).toEqual(false);
		expect(isUndefined(false)).toEqual(false);
	});

});

describe("SlangTypeValue.copy", () => {

	it("returns a true map copy", () => {
		const a = {a: 1};
		const b = copy(a) as SlangTypeMap;
		a.a = 2;
		expect(b.a).toBe(1);
	});

	it("returns a true stream copy", () => {
		const a = [1];
		const b = copy(a) as SlangTypeStream;
		a[0] = 4;
		expect(b[0]).toBe(1);
	});

});

describe("SlangTypeJson.equals", () => {

	it("returns true for strings", () => {
		expect(equals({type: "string"}, {type: "string"})).toEqual(true);
	});

	it("returns false for strings", () => {
		expect(equals({type: "string"}, {type: "number"})).toEqual(false);
	});

	it("returns true for maps", () => {
		expect(equals(
			{type: "map", map: {a: {type: "number"}}},
			{type: "map", map: {a: {type: "number"}}})).toEqual(true);
		expect(equals(
			{type: "map", map: {a: {type: "number"}, b: {type: "boolean"}}},
			{type: "map", map: {a: {type: "number"}, b: {type: "boolean"}}})).toEqual(true);
	});

	it("returns false for maps", () => {
		expect(equals(
			{type: "map", map: {a: {type: "number"}}},
			{type: "map", map: {a: {type: "string"}}})).toEqual(false);
		expect(equals(
			{type: "map", map: {a: {type: "number"}, b: {type: "boolean"}}},
			{type: "map", map: {a: {type: "number"}}})).toEqual(false);
		expect(equals(
			{type: "map", map: {b: {type: "boolean"}}},
			{type: "map", map: {a: {type: "number"}, b: {type: "boolean"}}})).toEqual(false);
		expect(equals(
			{type: "map", map: {a: {type: "number"}}},
			{type: "trigger"})).toEqual(false);
	});

	it("returns true for streams", () => {
		expect(equals(
			{type: "stream", stream: {type: "number"}},
			{type: "stream", stream: {type: "number"}})).toEqual(true);
	});

	it("returns false for streams", () => {
		expect(equals(
			{type: "stream", stream: {type: "number"}},
			{type: "stream", stream: {type: "boolean"}})).toEqual(false);
		expect(equals(
			{type: "stream", stream: {type: "number"}},
			{type: "number"})).toEqual(false);
	});

	it("returns true for generics", () => {
		expect(equals(
			{type: "generic", generic: "abcd"},
			{type: "generic", generic: "abcd"})).toEqual(true);
	});

	it("returns false for generics", () => {
		expect(equals(
			{type: "generic", generic: "abcd"},
			{type: "generic", generic: "bcde"})).toEqual(false);
		expect(equals(
			{type: "generic", generic: "abcd"},
			{type: "trigger"})).toEqual(false);
	});

});

describe("Slang type unification", () => {

	it("works in case of two maps", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("b", TypeIdentifier.String);

		const union = map1.union(map2);

		expect(union.isMap()).toEqual(true);
		expect(Array.from(union.getMapSubs()).length).toEqual(2);
		expect(union.findMapSub("a")!.isBoolean()).toEqual(true);
		expect(union.findMapSub("b")!.isString()).toEqual(true);
	});

	it("works in case of two deep maps", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Map).createMapSub("b", TypeIdentifier.Boolean);
		map2.createMapSub("a", TypeIdentifier.Map).createMapSub("c", TypeIdentifier.Number);

		const union = map1.union(map2);
		const unionSub = union.findMapSub("a")!;

		expect(union.isMap()).toEqual(true);
		expect(unionSub.isMap()).toEqual(true);
		expect(Array.from(unionSub.getMapSubs()).length).toEqual(2);
		expect(unionSub.findMapSub("b")!.isBoolean()).toEqual(true);
		expect(unionSub.findMapSub("c")!.isNumber()).toEqual(true);
	});

	it("throws exceptions", () => {
		const type1 = SlangType.newString();
		const type2 = SlangType.newBoolean();

		expect(() => type1.union(type2)).toThrow();
	});

});

describe("Slang type equality", () => {

	it("returns true in case of 2 maps", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("a", TypeIdentifier.Boolean);

		expect(map1.equals(map2)).toEqual(true);
	});

	it("returns false in case of 2 maps with same type", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("b", TypeIdentifier.Boolean);

		expect(map1.equals(map2)).toEqual(false);
	});

	it("returns false in case of 2 maps with same entry name", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("a", TypeIdentifier.Number);

		expect(map1.equals(map2)).toEqual(false);
	});

	it("returns false in case of 2 maps with 3 entries", () => {
		const map1 = SlangType.newMap();
		const map2 = SlangType.newMap();

		map1.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("a", TypeIdentifier.Boolean);
		map2.createMapSub("b", TypeIdentifier.Boolean);

		expect(map1.equals(map2)).toEqual(false);
	});

	it("returns true in case of 2 streams", () => {
		const stream1 = SlangType.newStream(TypeIdentifier.Number);
		const stream2 = SlangType.newStream(TypeIdentifier.Number);

		expect(stream1.equals(stream2)).toEqual(true);
	});

	it("returns true in case of 2 stream streams", () => {
		const stream1 = SlangType.newStream(TypeIdentifier.Stream);
		const stream2 = SlangType.newStream(TypeIdentifier.Stream);

		stream1.getStreamSub().createStreamSub(TypeIdentifier.Number);
		stream2.getStreamSub().createStreamSub(TypeIdentifier.Number);

		expect(stream1.equals(stream2)).toEqual(true);
	});

	it("returns false in case of 2 streams", () => {
		const stream1 = SlangType.newStream(TypeIdentifier.Number);
		const stream2 = SlangType.newStream(TypeIdentifier.Binary);

		expect(stream1.equals(stream2)).toEqual(false);
	});

	it("returns true in case of 2 generics", () => {
		const gen1 = SlangType.newGeneric("typeA");
		const gen2 = SlangType.newGeneric("typeA");

		expect(gen1.equals(gen2)).toEqual(true);
	});

	it("returns false in case of 2 generics", () => {
		const gen1 = SlangType.newGeneric("typeA");
		const gen2 = SlangType.newGeneric("typeB");

		expect(gen1.equals(gen2)).toEqual(false);
	});

});

describe("Slang type type definition", () => {

	it("can be generated from string", () => {
		const type = SlangType.newString();
		const def = type.getTypeDef();

		expect(def).toEqual({type: "string"});
	});

	it("can be generated from map", () => {
		const type = SlangType.newMap();
		type.createMapSub("a", TypeIdentifier.Number);
		type.createMapSub("b", TypeIdentifier.Trigger);
		const def = type.getTypeDef();

		expect(def).toEqual({type: "map", map: {a: {type: "number"}, b: {type: "trigger"}}});
	});

	it("can be generated from stream", () => {
		const type = SlangType.newStream(TypeIdentifier.Number);
		const def = type.getTypeDef();

		expect(def).toEqual({type: "stream", stream: {type: "number"}});
	});

	it("can be generated from generic", () => {
		const type = SlangType.newGeneric("testType");
		const def = type.getTypeDef();

		expect(def).toEqual({type: "generic", generic: "testType"});
	});

});
