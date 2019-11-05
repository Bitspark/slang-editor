import uuidv4 from "uuid/v4";

import {PortDirection} from "../../src/slang/core/abstract/port";
import {StreamType} from "../../src/slang/core/abstract/stream";
import {AppModel, LandscapeModel} from "../../src/slang/core/models";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";
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
		landscapeModel = appModel.createLandscape();
		new TestStorageApp(appModel, data);
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

		const oGenericInStream = bp.createBlankOperator(landscapeModel.findBlueprint("10a6eea5-4d5b-43b6-9106-6820d1009e3b")!);
		const oGenericToGeneric = bp.createBlankOperator(landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!);

		oGenericToGeneric.getGenerics().specify("itemType", SlangType.new(TypeIdentifier.Number));

		expect(oGenericToGeneric.OO.canConnect(oGenericInStream.II.sub)).toBeTruthy();

		oGenericToGeneric.OO.connect(oGenericInStream.II.sub, true);

		expect(oGenericToGeneric.OO.isConnectedWith(oGenericInStream.II.sub.getMapSubs().next().value)).toBeTruthy();
	});

	it("groups streams correctly", () => {
		const bp = landscapeModel
			.createBlueprint({
				uuid: uuidv4(),
				meta: {name: "test-bp-2"},
				type: BlueprintType.Local,
			})
			.definePort({
				name: "",
				type: SlangType.newNumber(),
				direction: PortDirection.In,
			})
			.definePort({
				name: "",
				type: SlangType.newUnspecified(),
				direction: PortDirection.Out,
			});
		const bpOutStreamMap = landscapeModel
			.createBlueprint({
				uuid: uuidv4(),
				meta: {name: "OutStreamMap"},
				type: BlueprintType.Local,
			})
			.definePort({
				name: "",
				type: SlangType.newTrigger(),
				direction: PortDirection.In,
			})
			.definePort({
				name: "",
				type: SlangType.newStream(SlangType.newMap({
					A: SlangType.newString(),
					B: SlangType.newNumber(),
				})),
				direction: PortDirection.Out,
			});
		const bpGenericToGeneric = landscapeModel
			.createBlueprint({
				uuid: uuidv4(),
				meta: {name: "GenericToGeneric"},
				type: BlueprintType.Local,
			})
			.definePort({
				name: "",
				type: SlangType.newGeneric("itemType"),
				direction: PortDirection.In,
			})
			.definePort({
				name: "",
				type: SlangType.newGeneric("itemType"),
				direction: PortDirection.Out,
			});

		const oOutStreamMap = bp.createBlankOperator(bpOutStreamMap);
		const oGenericToGeneric = bp.createBlankOperator(bpGenericToGeneric);

		bp.II.connect(bp.OO, true);
		oOutStreamMap.OO.sub.map("A").connect(oGenericToGeneric.II, true);
		oOutStreamMap.OO.sub.map("B").connect(oGenericToGeneric.II, true);
		Array.from(oGenericToGeneric.OO.getMapSubs()).forEach((port) => {
			port.connect(bp.OO, true);
		});

		expect(Array.from(bp.OO.getMapSubs()).length).toEqual(2);
		expect(Array.from(Array.from(bp.OO.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(2);
	});

	it("groups streams correctly after deletion", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});
		bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Number),
			direction: PortDirection.In,
		});
		const bpOut = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.Out,
		});

		const op2OS = bp.createBlankOperator(landscapeModel.findBlueprint("b444f701-59fc-43a8-8cdc-8bcce9dd471d")!);
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!);

		op2OS.getPortOut()!.getStreamSub().findMapSub("portA").connect(opG2G.getPortIn()!, true);
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portA") !== -1)!.connect(bpOut, true);
		op2OS.getPortOut()!.getStreamSub().findMapSub("portB").connect(opG2G.getPortIn()!, true);
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.connect(bpOut, true);

		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(2);

		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.disconnectAll();

		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(1);

		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.connect(bpOut, true);

		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(2);
	});

	it("infers the correct stream depth", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});
		const bpIn = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.In,
		});
		const bpOut = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.Out,
		});

		const opS2S = bp.createBlankOperator(landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!);
		const opSS2S = bp.createBlankOperator(landscapeModel.findBlueprint("605be7c4-b4df-41be-998f-82f7c23e518e")!);
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("384a2731-745b-4a7f-9972-ac2f4c31cf93")!);

		bpIn.connect(opS2S.getPortIn()!, true);
		opS2S.getPortOut()!.connect(bpOut, true);
		opSS2S.getPortOut()!.connect(bpOut, true);
		bpIn.getMapSubs().next().value.connect(opG2G.getPortIn()!, true);
		opG2G.getPortOut()!.connect(opSS2S.getPortIn()!.getStreamSub(), true);

		expect(opG2G.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toEqual(1);
		const mapEntry = opG2G.getPortOut()!.getMapSubs().next().value;
		expect(mapEntry.getTypeIdentifier()).toEqual(TypeIdentifier.Stream);
		expect(mapEntry.getStreamSub().getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(mapEntry.getStreamSub().getMapSubs()).length).toEqual(1);
		expect(mapEntry.getStreamSub().getMapSubs().next().value.isConnectedWith(opSS2S.getPortIn()!.getStreamSub())).toEqual(true);
	});

	it("infers the correct stream depth for converts", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});
		const bpIn = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.In,
		});
		const bpOut = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.Out,
		});

		const opS2S = bp.createBlankOperator(landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!);
		const opSS2S = bp.createBlankOperator(landscapeModel.findBlueprint("605be7c4-b4df-41be-998f-82f7c23e518e")!);
		const opConvert = bp.createBlankOperator(landscapeModel.findBlueprint("d1191456-3583-4eaf-8ec1-e486c3818c60")!);

		bpIn.connect(opS2S.getPortIn()!, true);
		opS2S.getPortOut()!.connect(bpOut, true);
		opSS2S.getPortOut()!.connect(bpOut, true);
		bpIn.getMapSubs().next().value.connect(opConvert.getPortIn()!, true);
		expect(opConvert.getPortOut()!.canConnect(opSS2S.getPortIn()!.getStreamSub(), true)).toEqual(false);
	});

});
