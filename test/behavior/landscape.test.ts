import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TestStorageApp} from "../helpers/TestStorageApp";

import data from "../resources/definitions.json";

describe("The landscape", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		const ls = appModel.getChildNode(LandscapeModel);
		if (!ls) {
			throw new Error("landscape not found");
		}
		landscapeModel = ls;
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
});
