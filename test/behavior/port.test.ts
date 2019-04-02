import uuidv4 from "uuid/v4";

import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel, BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {OperatorModel} from "../../src/slang/core/models/operator";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

describe("A port", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	let bpNew!: BlueprintModel;
	let bp!: BlueprintModel;
	let op!: OperatorModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		const ls = appModel.getChildNode(LandscapeModel);
		if (!ls) {
			throw new Error("landscape not found");
		}
		landscapeModel = ls;
		await appModel.load();

		bpNew = landscapeModel.createBlueprint({uuid: uuidv4(), meta: {name: "test-bp-2"}, type: BlueprintType.Local});

		bp = landscapeModel.findBlueprint("717867d5-f84e-400c-bdc4-1a374f34e3a5")!;
		op = bpNew.createBlankOperator(bp);
	});

	it("returns correct string reference", () => {
		const portIn = op.getPortIn()!;
		const portOut = op.getPortOut()!;

		expect(portIn.findMapSub("a").getStreamSub().getPortReference()).toEqual("a.~");
		expect(portIn.findMapSub("b").findMapSub("c").getPortReference()).toEqual("b.c");
		expect(portOut.getStreamSub().getStreamSub().findMapSub("a").getPortReference()).toEqual("~.~.a");
	});

});
