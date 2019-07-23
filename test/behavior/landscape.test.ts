import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TypeIdentifier} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

describe("The landscape", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		landscapeModel = appModel.createLandscape();
		await appModel.load();
	});

	it("has blueprints", () => {
		const bps = landscapeModel.getChildNodes(BlueprintModel);
		expect(Array.from(bps).length).toBeGreaterThan(0);
	});

	it("has blueprint 'string to string'", () => {
		const bp = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b");
		expect(bp).toBeTruthy();
	});

	it("can be created from bundle", () => {
		const rlt = appModel.loadBundle({
			main: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
			blueprints: {
				"a4df2ce5-bf32-4be3-b0a3-85411ec699d4": {
					id: "a4df2ce5-bf32-4be3-b0a3-85411ec699d4",
					meta: {
						name: "Test Bluprint",
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
		});
		expect(rlt.landscape.findBlueprint("a4df2ce5-bf32-4be3-b0a3-85411ec699d4")).toBeTruthy();
		expect(rlt.blueprint.name).toEqual("Test Bluprint");
		expect(rlt.blueprint.getPortIn()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);
		expect(rlt.blueprint.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.Number);
	});
});
