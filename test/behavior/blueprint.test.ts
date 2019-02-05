import {PortDirection} from "../../src/slang/core/abstract/port";
import {GenericSpecifications} from "../../src/slang/core/abstract/utils/generics";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";
import uuidv4 = require("uuid/v4");

import data from "../resources/definitions.json";

describe("A new blueprint", () => {
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

	it("can be created", () => {
		const bp = landscapeModel.createBlueprint({uuid: uuidv4(), name: "test-bp-1", type: BlueprintType.Local});
		expect(bp).toBeTruthy();
	});

	it("can have operators added", () => {
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			name: "test-bp-2",
			type: BlueprintType.Local
		});
		bpNew.createPort({name: "", type: new SlangType(null, TypeIdentifier.Map), direction: PortDirection.In});
		bpNew.createPort({name: "", type: new SlangType(null, TypeIdentifier.Map), direction: PortDirection.Out});

		const opNew = bpNew.createOperator("StringToString", bpS2S, null, null);
		expect(opNew.getPortIn()).toBeTruthy();
		expect(opNew.getPortOut()).toBeTruthy();
	});

	it("can have ports created and removed dynamically", () => {
		// Test setup:
		// [ -> [S2S] ]

		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			name: "test-bp-3",
			type: BlueprintType.Local
		});
		bpNew.createPort({name: "", direction: PortDirection.In, type: SlangType.newUnspecified()});
		bpNew.createPort({name: "", direction: PortDirection.Out, type: SlangType.newUnspecified()});

		const opNew = bpNew.createOperator("s2s", bpS2S, null, null);

		const bpPortIn = bpNew.getPortIn()!;
		const opPortIn = opNew.getPortIn()!;

		expect(bpPortIn.getTypeIdentifier()).toBe(TypeIdentifier.Unspecified);
		expect(opPortIn.getTypeIdentifier()).toBe(TypeIdentifier.String);

		opPortIn.connect(bpPortIn, true);

		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(1);

		const newPort = bpPortIn.getMapSubs().next().value;

		expect(newPort.getConnectedWith()).toContain(opPortIn);
		expect(opPortIn.getConnectedWith()).toContain(newPort);

		newPort.disconnectTo(opPortIn);

		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(0);
	});

	it("can have generic operator ports created and removed dynamically", () => {
		// Test setup:
		// [S2S] -> [G2G] -> [S2S]

		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpG2G = landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			name: "test-bp-4",
			type: BlueprintType.Local
		});

		const opS2S1 = bpNew.createOperator("s2s_1", bpS2S, null, null);
		const opG2G = bpNew.createOperator("g2g", bpG2G, null, new GenericSpecifications(["itemType"]));

		opS2S1.getPortOut()!.connect(opG2G.getPortIn()!, true);

		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toBe(1);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toBe(1);

		const opS2S2 = bpNew.createOperator("s2s_2", bpS2S, null, null);

		opS2S2.getPortIn()!.connect(opG2G.getPortOut()!.getMapSubs().next().value, true);

		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toBe(1);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toBe(1);

		opS2S1.getPortOut()!.disconnectTo(opG2G.getPortIn()!.getMapSubs().next().value);

		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toBe(1);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toBe(1);

		opG2G.getPortOut()!.getMapSubs().next().value.disconnectTo(opS2S2.getPortIn()!);

		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toBe(0);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toBe(0);
	});
});
