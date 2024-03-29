import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TypeIdentifier} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";
import {SlangFileJson} from "../../src/slang/definitions/api";

describe("The landscape", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	beforeEach(() => {
		appModel = AppModel.create("test-app");
		landscapeModel = appModel.createLandscape();
		new TestStorageApp(appModel, data);
	});

	it("has blueprints", () => {
		const bps = landscapeModel.getChildNodes(BlueprintModel);
		expect(Array.from(bps).length).toBeGreaterThan(0);
	});

	it("has blueprint 'string to string'", () => {
		const bp = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b");
		expect(bp).toBeTruthy();
	});

	it("can load a bundle", () => {
		const bundle: SlangFileJson = {
			main: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
			blueprints: {
				"a4df2ce5-bf32-4be3-b0a3-85411ec699d4": {
					id: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
					meta: {
						name: "Test Blueprint",
					},
					services: {
						main: {
							in: {
								type: "string",
							},
							out: {
								type: "number",
							},
						},
					},
				},
			},
		};

		const bp = landscapeModel.import(bundle);
		expect(landscapeModel.findBlueprint("a4df2ce5-bf32-4be3-b0a3-85411ec699d4")).toBeTruthy();
		expect(bp.name).toEqual("Test Blueprint");
		expect(bp.getPortIn()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);
		expect(bp.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.Number);

		const bp2 = landscapeModel.import(bundle);
		expect(bp).toEqual(bp2);
	});

	it("can load a bundle with existing bps", () => {
		const bundle1: SlangFileJson = {
			main: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
			blueprints: {
				"a4df2ce5-bf32-4be3-b0a3-85411ec699d4": {
					id: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
					meta: {
						name: "Test Blueprint",
					},
					services: {
						main: {
							in: {
								type: "string",
							},
							out: {
								type: "number",
							},
						},
					},
				},
			},
		};

		const bundle2: SlangFileJson = {
			main: "27cfa63a-f2e3-4cb1-8b92-d709064214a9",
			blueprints: {
				"a4df2ce5-bf32-4be3-b0a3-85411ec699d4": {
					id: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
					meta: {
						name: "Test Blueprint",
					},
					services: {
						main: {
							in: {
								type: "string",
							},
							out: {
								type: "number",
							},
						},
					},
				},
				"27cfa63a-f2e3-4cb1-8b92-d709064214a9": {
					id: "27cfa63a-f2e3-4cb1-8b92-d709064214a9",
					meta: {
						name: "Test Blueprint 2",
					},
					services: {
						main: {
							in: {
								type: "boolean",
							},
							out: {
								type: "trigger",
							},
						},
					},
					operators: {
						a: {
							operator: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
							generics: {},
							properties: {},
						},
					},
				},
			},
		};

		landscapeModel.import(bundle1);
		const bp = landscapeModel.import(bundle2);

		expect(landscapeModel.findBlueprint("27cfa63a-f2e3-4cb1-8b92-d709064214a9")).toBeTruthy();
		expect(bp.name).toEqual("Test Blueprint 2");
	});

	it("can export a bundle", () => {
		const bp = landscapeModel.findBlueprint("8019ef19-94c1-46d4-9a34-6dcd4a5281a8");
		const bundle = landscapeModel.export(bp!);
		expect(Object.keys(bundle.blueprints)).toEqual(["8019ef19-94c1-46d4-9a34-6dcd4a5281a8", "ba24c37f-2b04-44b4-97ad-fd931c9ab77b"]);
	});
});
