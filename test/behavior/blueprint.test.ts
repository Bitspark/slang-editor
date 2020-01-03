import uuidv4 from "uuid/v4";

import {PortDirection} from "../../src/slang/core/abstract/port";
import {GenericSpecifications} from "../../src/slang/core/abstract/utils/generics";
import {PropertyAssignments} from "../../src/slang/core/abstract/utils/properties";
import {blueprintModelToJson} from "../../src/slang/core/mapper";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {OperatorModel} from "../../src/slang/core/models/operator";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

// tslint:disable:no-magic-numbers

describe("A new blueprint", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		landscapeModel = appModel.createLandscape();
		new TestStorageApp(appModel, data);
	});

	it("can be created", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-1"},
			type: BlueprintType.Local,
		});
		expect(bp).toBeTruthy();
	});

	it("can have operators added", () => {
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});
		bpNew.createPort({name: "", type: new SlangType(null, TypeIdentifier.Map), direction: PortDirection.In});
		bpNew.createPort({name: "", type: new SlangType(null, TypeIdentifier.Map), direction: PortDirection.Out});

		const opNew = bpNew.createBlankOperator(bpS2S);
		expect(opNew.getPortIn()).toBeTruthy();
		expect(opNew.getPortOut()).toBeTruthy();
	});

	it("can have operators deleted", () => {
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-3"},
			type: BlueprintType.Local,
		});

		const opNew = bpNew.createBlankOperator(bpS2S);
		expect(Array.from(bpNew.getChildNodes(OperatorModel)).length).toEqual(1);

		opNew.destroy();
		expect(Array.from(bpNew.getChildNodes(OperatorModel)).length).toEqual(0);
	});

	it("can have ports created and removed dynamically", () => {
		// bpS2S ports:
		// In: string
		// Out: string
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-3"},
			type: BlueprintType.Local,
		});
		bpNew.createPort({name: "", direction: PortDirection.In, type: SlangType.newUnspecified()});
		bpNew.createPort({name: "", direction: PortDirection.Out, type: SlangType.newUnspecified()});

		const opNew = bpNew.createBlankOperator(bpS2S);

		const bpPortIn = bpNew.getPortIn()!;
		const opPortIn = opNew.getPortIn()!;

		// The blueprint should look like this now:
		// +---------------+
		// |    +-----+    |
		// |    O S2S |    |
		// |    |     |    |
		// |    +-----+    |
		// +---------------+

		// We expect these types:
		expect(bpPortIn.getTypeIdentifier()).toBe(TypeIdentifier.Unspecified);
		expect(opPortIn.getTypeIdentifier()).toBe(TypeIdentifier.String);

		// Now, connect in-port of the operator with in-port of the blueprint
		opPortIn.connect(bpPortIn, true);

		// The blueprint should look like this now:
		// +---------------+
		// |    +-----+    |
		// O--->O S2S |    |
		// |    |     |    |
		// |    +-----+    |
		// +---------------+

		// So we expect 1 entry in the generic in-port map of the blueprint:
		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(1);

		// Fetch this automatically created in-port of the blueprint:
		const newPort = bpPortIn.getMapSubs().next().value;

		// Test if the connections are as expected (see ASCII sketch above)
		expect(newPort.isConnectedWith(opPortIn)).toBeTruthy();
		expect(opPortIn.isConnectedWith(newPort)).toBeTruthy();

		// Disconnect the port now:
		newPort.disconnectTo(opPortIn);

		// The blueprint should look like this now:
		// +---------------+
		// |    +-----+    |
		// |    O S2S |    |
		// |    |     |    |
		// |    +-----+    |
		// +---------------+

		// And test if the automatically created in-port has vanished:
		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(0);
	});

	it("can have blueprint ports removed when deleting connected operator", () => {
		// Test setup:
		// [ -> [S2S] ]

		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-3"},
			type: BlueprintType.Local,
		});
		bpNew.createPort({name: "", direction: PortDirection.In, type: SlangType.newUnspecified()});
		bpNew.createPort({name: "", direction: PortDirection.Out, type: SlangType.newUnspecified()});

		const opNew = bpNew.createBlankOperator(bpS2S);

		const bpPortIn = bpNew.getPortIn()!;
		const opPortIn = opNew.getPortIn()!;

		opPortIn.connect(bpPortIn, true);

		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(1);

		const newPort = bpPortIn.getMapSubs().next().value;

		expect(newPort.isConnectedWith(opPortIn)).toBeTruthy();
		expect(opPortIn.isConnectedWith(newPort)).toBeTruthy();

		opNew.destroy();

		expect(newPort.isConnected()).toBeFalsy();
		expect(Array.from(bpPortIn.getMapSubs()).length).toEqual(0);
	});

	it("can have generic operator ports created and removed dynamically", () => {
		// Test setup:
		// [S2S] -> [G2G] -> [S2S]

		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpG2G = landscapeModel.findBlueprint("dc1aa556-d62e-4e07-adbb-53dc317481b0")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-4"},
			type: BlueprintType.Local,
		});

		const opS2S1 = bpNew.createBlankOperator(bpS2S);
		const gens = new GenericSpecifications(["itemType"]);
		const opG2G = bpNew.createOperator("g2g", bpG2G, new PropertyAssignments([].values(), gens), gens);

		opS2S1.getPortOut()!.connect(opG2G.getPortIn()!, true);

		expect(Array.from(opG2G.getPortIn()!.getMapSubs()).length).toBe(1);
		expect(Array.from(opG2G.getPortOut()!.getMapSubs()).length).toBe(1);

		const opS2S2 = bpNew.createBlankOperator(bpS2S);

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

	it("can be mapped to JSON", () => {
		const outer = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-1"},
			type: BlueprintType.Local,
		});

		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-2"},
			type: BlueprintType.Local,
		});

		outer.createBlankOperator(bp);

		const outerJSON = blueprintModelToJson(outer);

		expect(outerJSON.meta.name).toEqual(outer.name);
		expect(outerJSON.geometry!.size).toEqual(outer.size);
		expect(outerJSON).toBeDefined();
		expect(Object.keys(outerJSON.operators!)).toHaveLength(1);
	});

	it("is mapped to JSON correctly", () => {
		const bpJSON = blueprintModelToJson(landscapeModel.findBlueprint("cbc2cb11-c30a-4194-825c-f042902bd18b")!);
		expect(bpJSON).toEqual({
			id: "cbc2cb11-c30a-4194-825c-f042902bd18b",
			meta: {name: "PropertyPorts"},
			geometry: {size: {width: 240, height: 147}, port: {in: {position: 0}, out: {position: 0}}},
			operators: {},
			services: {
				main: {
					in: {type: "map", map: {"sub_{ports}_number": {type: "number"}}},
					geometry: {in: {position: 0}, out: {position: 0}},
					out: {type: "primitive"},
				},
			},
			delegates: {},
			properties: {ports: {type: "stream", stream: {type: "string"}}},
			connections: {},
		});
	});

	it("is mapped to JSON correctly for delegates", () => {
		const bpJSON = blueprintModelToJson(landscapeModel.findBlueprint("0e2cd15e-e471-4780-800f-2f27de018417")!);
		expect(bpJSON).toEqual({
			id: "0e2cd15e-e471-4780-800f-2f27de018417",
			meta: {name: "Connections delegate"},
			geometry: {
				size: {width: 240, height: 147},
				port: {in: {position: 0}, out: {position: 0}},
			},
			operators: {},
			services: {
				main: {
					in: {type: "string"},
					geometry: {in: {position: 0}, out: {position: 0}},
					out: {type: "boolean"},
				},
			},
			delegates: {
				dlg1: {
					in: {type: "boolean"},
					out: {type: "map", map: {a: {type: "string"}}},
					geometry: {in: {position: 0}, out: {position: 0}},
				},
			},
			properties: {},
			connections: {"(": [".dlg1)a"], "(.dlg1": [")"]},
		});
	});

	it("is mapped to JSON correctly for multiple connections", () => {
		const bpJSON = blueprintModelToJson(landscapeModel.findBlueprint("8019ef19-94c1-46d4-9a34-6dcd4a5281a8")!);
		expect(bpJSON).toEqual({
			id: "8019ef19-94c1-46d4-9a34-6dcd4a5281a8",
			meta: {name: "Connections"},
			geometry: {size: {width: 240, height: 147}, port: {in: {position: 0}, out: {position: 0}}},
			operators: {a: {operator: "ba24c37f-2b04-44b4-97ad-fd931c9ab77b", properties: {}, generics: {}}},
			services: {
				main: {
					in: {type: "string"},
					geometry: {in: {position: 0}, out: {position: 0}},
					out: {type: "map", map: {x: {type: "string"}, y: {type: "string"}}},
				},
			},
			delegates: {},
			properties: {},
			connections: {"(": ["(a", ")y"], "a)": [")x"]},
		});
	});

	it("has port positions", () => {
		const bp = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-bp-1"},
			type: BlueprintType.Local,
		});

		expect(bp.inPosition).toEqual(0);
		expect(bp.outPosition).toEqual(0);

		bp.inPosition = 10;
		expect(bp.inPosition).toEqual(10);

		bp.outPosition = 20;
		expect(bp.outPosition).toEqual(20);
	});
});
