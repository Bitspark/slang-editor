import uuidv4 from "uuid/v4";

import {StreamType} from "../../src/slang/core/abstract/stream";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";

// tslint:disable:no-magic-numbers

describe("A stream type", () => {

	it("returns correct depth", () => {
		const baseStream = new StreamType(null, null);
		expect(baseStream.getStreamDepth()).toBe(1);

		const stream1 = new StreamType(baseStream, null);
		expect(stream1.getStreamDepth()).toBe(2);

		const stream2 = new StreamType(stream1, null);
		expect(stream2.getStreamDepth()).toBe(3);
	});

});

describe("A stream port", () => {

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

	it("forbids incorrect flat connections", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-1"},
			type: BlueprintType.Local,
		});

		const opTO1 = bp.createBlankOperator(landscapeModel.findBlueprint("cd9dabfe-6664-4788-a8d3-0f6d5b2dbe6a")!);
		const opTI1 = bp.createBlankOperator(landscapeModel.findBlueprint("1cbe6fa4-7501-49ca-95c3-a0fa428711ff")!);

		const outTO1AStr = opTO1.getPortOut()!.findMapSub("a").getStreamSub();
		const outTO1BStr = opTO1.getPortOut()!.findMapSub("b").getStreamSub();

		outTO1AStr.connect(opTI1.getPortIn()!.findMapSub("a")!, false);
		expect(outTO1BStr.canConnect(opTI1.getPortIn()!.findMapSub("b")!)).toBeFalsy();
	});

	it("allows valid connections", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});

		const opGIS = bp.createBlankOperator(landscapeModel.findBlueprint("10a6eea5-4d5b-43b6-9106-6820d1009e3b")!);
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!);

		opG2G.getGenerics().specify("itemType", SlangType.new(TypeIdentifier.Number));

		const g2gOut = opG2G.getPortOut()!;
		const gisInSub = opGIS.getPortIn()!.getStreamSub();

		expect(g2gOut.canConnect(gisInSub)).toEqual(true);
		g2gOut.connect(gisInSub, true);
		expect(g2gOut.isConnectedWith(gisInSub.getMapSubs().next().value)).toEqual(true);
	});

});
