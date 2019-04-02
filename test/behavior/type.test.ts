import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";

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
	});

	it("can be a number", () => {
		const type = new SlangType(null, TypeIdentifier.Number);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Number);
		expect(typeCpy.isNumber()).toEqual(true);
	});

	it("can be a boolean", () => {
		const type = new SlangType(null, TypeIdentifier.Boolean);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Boolean);
		expect(typeCpy.isBoolean()).toEqual(true);
	});

	it("can be a binary", () => {
		const type = new SlangType(null, TypeIdentifier.Binary);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Binary);
		expect(typeCpy.isBinary()).toEqual(true);
	});

	it("can be a trigger", () => {
		const type = new SlangType(null, TypeIdentifier.Trigger);
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Trigger);
		expect(typeCpy.isTrigger()).toEqual(true);
	});

	it("can be a generic", () => {
		const type = new SlangType(null, TypeIdentifier.Generic);
		type.setGenericIdentifier("testType");
		const typeCpy = type.copy();
		expect(typeCpy.getTypeIdentifier()).toEqual(TypeIdentifier.Generic);
		expect(typeCpy.isGeneric()).toEqual(true);

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

		expect(typeCpy.findMapSub("a")!.isString()).toEqual(true);
		typeCpy.addMapSub("a", new SlangType(typeCpy, TypeIdentifier.Number));
		typeCpy.addMapSub("b", new SlangType(typeCpy, TypeIdentifier.String));
		expect(typeCpy.findMapSub("a")!.isNumber()).toEqual(true);
		expect(Array.from(typeCpy.getMapSubs()).length).toEqual(2);
		expect(type.findMapSub("a")!.isString()).toEqual(true);
		expect(Array.from(type.getMapSubs()).length).toEqual(1);
	});

});

// TODO: union
// TODO: equals
// TODO: getTypeDef
// TODO: isVoid
