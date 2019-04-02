import uuidv4 from "uuid/v4";

import {StreamType} from "../../src/slang/core/abstract/stream";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TestStorageApp} from "../helpers/TestStorageApp";

import data from "../resources/definitions.json";

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

	it("assigns the correct stream type", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-1"},
			type: BlueprintType.Local,
		});

		const opTs = bp.createBlankOperator(landscapeModel.findBlueprint("475f9092-8925-4a5c-b279-186f524da4b4")!); // [[a][b]] => []
		const opNs1 = bp.createBlankOperator(landscapeModel.findBlueprint("12cfe9ae-2586-4285-bc67-71b19864f1b9")!); // [] => [[]]
		const opNs2 = bp.createBlankOperator(landscapeModel.findBlueprint("12cfe9ae-2586-4285-bc67-71b19864f1b9")!); // [] => [[]]

		const inTsAStr = opTs.getPortIn()!.findMapSub("a").getStreamSub();
		// const inTsBStr = opTs.getPortIn()!.findMapSub("b").getStreamSub();

		const outNs1 = opNs1.getPortOut()!.getStreamSub();
		const outNs2 = opNs2.getPortOut()!.getStreamSub();

		outNs1.connect(inTsAStr, true);
		outNs2.connect(inTsAStr, true);

		// We expect for inTsAStr something like [a1,[a2]]
		// With outNs1 => [a1]
		// With outNs2 => [a2]

		expect(Array.from(inTsAStr.getMapSubs()).length).toBe(2);
		const a1 = outNs1.getConnectedWith().next().value;
		const a2 = outNs2.getConnectedWith().next().value;

		expect(a1.getStreamDepth()).toBe(2);
		expect(a2.getStreamDepth()).toBe(3);
		expect(a2.getStreamPort().getStreamType().getBaseStreamOrNull()).toBe(a1.getStreamPort().getStreamType());
	});

});
