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

		// op2OS ports:
		// In: trigger
		// Out: Stream(portA: string, portB: number)
		const op2OS = bp.createBlankOperator(landscapeModel.findBlueprint("b444f701-59fc-43a8-8cdc-8bcce9dd471d")!);

		// opG2G ports:
		// In: Generic("itemType")
		// Out: Generic("itemType")
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!);

		// Connect out-port Stream(portA: string) of op2OS with generic in-port of opG2G
		op2OS.getPortOut()!.getStreamSub().findMapSub("portA").connect(opG2G.getPortIn()!, true);

		// We expect opG2G to have an out-port of type Stream(portA: string) now,
		// because it is linked via the generic identifier "itemType" with the in-port we just connected

		// Connect this out-port with the blueprint out-port
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portA") !== -1)!.connect(bpOut, true);

		// Connect out-port Stream(portB: number) of op2OS with generic in-port of opG2G
		op2OS.getPortOut()!.getStreamSub().findMapSub("portB").connect(opG2G.getPortIn()!, true);

		// We expect opG2G to have a second entry in its out-port Stream map:
		// Stream(portA: string, portB: number)

		// Again, connect the second out-port of opG2G with the blueprint out-port
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.connect(bpOut, true);

		// The blueprint should look like this now:

		// +----------------------+
		// |    +---+    +---+    |
		// |    |2OS|===>|G2G|===>| (portA)
		// |    |   |===>|   |===>| (portB)
		// |    +---+    +---+    |
		// +----------------------+

		// The blueprint out-port should have the following form:
		// Map(a: Stream(portA: string, portB: number))

		// So we expect the blueprint out-port to have one entry in the top map (above called "a"):
		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);

		// We expect this one entry to be of type stream wrapped around a map with two entries ("portA" and "portB"):
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(2);

		// Now, disconnect portB of G2G from blueprint out-port
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.disconnectAll();

		// The blueprint should look like this now:

		// +----------------------+
		// |    +---+    +---+    |
		// |    |2OS|===>|G2G|===>| (portA)
		// |    |   |===>|   |    |
		// |    +---+    +---+    |
		// +----------------------+

		// The blueprint out-port should have the following form:
		// Map(a: Stream(portA: string))

		// So we expect the blueprint out-port to still have a map with one entry (above called "a")
		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);

		// But now, there should only be 1 entry in the wrapped map ("portA")
		expect(Array.from(Array.from(bpOut.getMapSubs()).find((port) => port.getType().isStream())!.getStreamSub().getMapSubs()).length).toEqual(1);

		// Now, connect out-port portB of operator G2G again:
		Array.from(opG2G.getPortOut()!.getMapSubs()).find((port) => port.getName().indexOf("portB") !== -1)!.connect(bpOut, true);

		// The blueprint should again look like this now:

		// +----------------------+
		// |    +---+    +---+    |
		// |    |2OS|===>|G2G|===>| (portA)
		// |    |   |===>|   |===>| (portB)
		// |    +---+    +---+    |
		// +----------------------+

		// And the blueprint out-port should have the following form:
		// Map(a: Stream(portA: string, portB: number))

		// This of course should still be the case (like above):
		expect(Array.from(bpOut.getMapSubs()).length).toEqual(1);

		// This is actually what this test should make sure:
		// The out-port "portB" of operator G2G should be within the same stream as "portA" and not be a separate entry in the out-port map:
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

		// opS2S ports:
		// In: string
		// Out: string
		const opS2S = bp.createBlankOperator(landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!);

		// opSS2S ports:
		// In: Stream(string)
		// Out: string
		const opSS2S = bp.createBlankOperator(landscapeModel.findBlueprint("605be7c4-b4df-41be-998f-82f7c23e518e")!);

		// opG2G ports:
		// In: Generic("itemType")
		// Out: Generic("itemType")
		const opG2G = bp.createBlankOperator(landscapeModel.findBlueprint("384a2731-745b-4a7f-9972-ac2f4c31cf93")!);

		// The blueprint should look like this now:
		// +--------------------------------------+
		// |    +-----+    +------+    +-----+    |
		// |    O S2S O    O SS2S O    | G2G |    |
		// |    |     |    |      |    |     |    |
		// |    +-----+    +------+    +-----+    |
		// +--------------------------------------+

		// Connect operators:
		bpIn.connect(opS2S.getPortIn()!, true);
		opS2S.getPortOut()!.connect(bpOut, true);
		opSS2S.getPortOut()!.connect(bpOut, true);
		bpIn.getMapSubs().next().value.connect(opG2G.getPortIn()!, true);
		opG2G.getPortOut()!.connect(opSS2S.getPortIn()!.getStreamSub(), true);

		// The blueprint should look like this now:
		// +------------------------------------------------------------+
		// |                                                            |
		// |              +-------------------------------------------->O
		// |              |                   +------------------------>O
		// |              |                   |   +===============+     |
		// |      +-----+ |        +------+   |   |      +-----+  |     |
		// O--+-->O S2S O-+   +===>O SS2S O---+   |   +->O G2G O==+     |
		// |  |   |     |     |    |      |       |   |  |     |        |
		// |  |   +-----+     |    +------+       |   |  +-----+        |
		// |  |               +===================+   |                 |
		// |  +---------------------------------------+                 |
		// |                                                            |
		// +------------------------------------------------------------+

		expect(opG2G.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toEqual(1);

		const mapEntry = opG2G.getPortOut()!.getMapSubs().next().value;

		// Since the in-port of SS2S is a stream port, we expect the generic out-port to have inferred to be a stream as well:
		expect(mapEntry.getTypeIdentifier()).toEqual(TypeIdentifier.Stream);

		// Automatically created ports should be maps:
		expect(mapEntry.getStreamSub().getTypeIdentifier()).toEqual(TypeIdentifier.Map);

		// There should be 1 map entry:
		expect(Array.from(mapEntry.getStreamSub().getMapSubs()).length).toEqual(1);

		// Expect a connection between the base ports (see double-line in the ASCII sketch above) (1)
		expect(mapEntry.getStreamSub().getMapSubs().next().value.isConnectedWith(opSS2S.getPortIn()!.getStreamSub())).toEqual(true);

		/*
		 * (1) If two ports of the form Stream(x) and Stream(y) are connected, we do not expect this:
		 *     Stream(x) --> Stream(y)
		 *     but this:
		 *     x --> y
		 */
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
