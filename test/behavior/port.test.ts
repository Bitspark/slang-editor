import uuidv4 from "uuid/v4";

import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel, BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {OperatorModel} from "../../src/slang/core/models/operator";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";
import {SlangType} from "../../src/slang/definitions/type";

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

	it("can be generated and deleted automatically", () => {
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpG2G = landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!;

		const bpNew2 = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-11"},
			type: BlueprintType.Local,
		});

		const opS2S1 = bpNew2.createBlankOperator(bpS2S);
		const opS2S2 = bpNew2.createBlankOperator(bpS2S);
		const opG2G = bpNew2.createBlankOperator(bpG2G);

		opS2S1.getPortOut()!.connect(opG2G.getPortIn()!, true);
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(1);

		const generatedPortOut = opG2G.getPortOut()!.getMapSubs().next().value;

		opS2S1.getPortOut()!.connect(opG2G.getPortIn()!, true);
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(2);

		generatedPortOut.connect(opS2S2.getPortIn()!, true);

		opS2S1.getPortOut()!.disconnectAll();
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(1);

		generatedPortOut.disconnectAll();
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(0);
	});

	it("is not deleted when generated manually", () => {
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpG2G = landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!;

		const bpNew2 = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-11"},
			type: BlueprintType.Local,
		});

		const opS2S = bpNew2.createBlankOperator(bpS2S);
		const opG2G = bpNew2.createBlankOperator(bpG2G);

		const mapType = SlangType.newMap();
		mapType.addMapSub("a", SlangType.newString());

		opG2G.getGenerics().specify("itemType", mapType);
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(1);

		const specifiedPortIn = opG2G.getPortIn()!.findMapSub("a");

		opS2S.getPortOut()!.connect(specifiedPortIn, true);
		specifiedPortIn.disconnectAll();
		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toEqual(1);
	});

});
