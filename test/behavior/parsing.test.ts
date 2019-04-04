import {SlangParsing} from "../../src/slang/definitions/parsing";

// tslint:disable:no-magic-numbers

describe("Parsing", () => {

	it("returns undefined", () => {
		expect(SlangParsing.parseReferenceString("")).toBeUndefined();
		expect(SlangParsing.parseReferenceString("abc")).toBeUndefined();
		expect(SlangParsing.parseReferenceString("((")).toBeUndefined();
		expect(SlangParsing.parseReferenceString("(..")).toBeUndefined();
		expect(SlangParsing.parseReferenceString("##)")).toBeUndefined();
	});

	it("works for in port", () => {
		const info = SlangParsing.parseReferenceString("e(c.d")!;

		expect(info.blueprint).toBeUndefined();
		expect(info.instance).toBe("c");
		expect(info.delegate).toBe("d");
		expect(info.directionIn).toBe(true);
		expect(info.port).toBe("e");
	});

	it("works for out port", () => {
		const info = SlangParsing.parseReferenceString(")")!;

		expect(info.blueprint).toBeUndefined();
		expect(info.instance).toBe("");
		expect(info.delegate).toBeUndefined();
		expect(info.directionIn).toBe(false);
		expect(info.port).toBe("");
	});

	it("works for out port", () => {
		const info = SlangParsing.parseReferenceString("a)")!;

		expect(info.blueprint).toBeUndefined();
		expect(info.instance).toBe("a");
		expect(info.delegate).toBeUndefined();
		expect(info.directionIn).toBe(false);
		expect(info.port).toBe("");
	});

	it("works with blueprints", () => {
		const info = SlangParsing.parseReferenceString("e(f.g#c.d")!;

		expect(info.blueprint).toBe("f.g");
		expect(info.instance).toBe("c");
		expect(info.delegate).toBe("d");
		expect(info.directionIn).toBe(true);
		expect(info.port).toBe("e");
	});

});
