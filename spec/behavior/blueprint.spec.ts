import {AppModel} from "../../src/slang/core/model/app";
import {LandscapeModel} from "../../src/slang/core/model/landscape";
import {BlueprintType} from "../../src/slang/core/model/blueprint";

import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

describe("A blueprint", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	beforeEach(() => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		const ls = appModel.getChildNode(LandscapeModel);
		if (!ls) {
			throw new Error("landscape not found");
		}
		landscapeModel = ls;
	});

	it("can be created", () => {
		const bp = landscapeModel.createBlueprint({fullName: "test-bp-1", type: BlueprintType.Local});
		expect(bp).toBeTruthy();
	});
});