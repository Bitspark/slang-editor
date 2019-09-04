import uuidv4 from "uuid/v4";

import {PortDirection} from "../../src/slang/core/abstract/port";
import {StreamType} from "../../src/slang/core/abstract/stream";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
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
		new TestStorageApp(appModel, data);
		landscapeModel = appModel.createLandscape();
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

	it("groups streams correctly", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});
		const bpIn = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Number),
			direction: PortDirection.In,
		});
		const bpOut = bp.createPort({
			name: "",
			type: new SlangType(null, TypeIdentifier.Unspecified),
			direction: PortDirection.Out,
		});

		bpIn.connect(bpOut, true);

		const op2OS = bp.createBlankOperator(landscapeModel.findBlueprint("b444f701-59fc-43a8-8cdc-8bcce9dd471d")!);
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!);

		const osOut = op2OS.getPortOut()!;
		const g2gIn = opG2G.getPortIn()!;
		const g2gOut = opG2G.getPortOut()!;

		osOut.getStreamSub().findMapSub("portA").connect(g2gIn, true);
		osOut.getStreamSub().findMapSub("portB").connect(g2gIn, true);
		Array.from(g2gOut.getMapSubs()).forEach((port) => {
			port.connect(bpOut, true);
		});

		expect(Array.from(bpOut.getMapSubs()).length).toEqual(2);
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(2);
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
