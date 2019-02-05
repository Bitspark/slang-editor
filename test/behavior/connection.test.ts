import uuidv4 from "uuid/v4";

import {PortDirection} from "../../src/slang/core/abstract/port";
import {Connection, Connections} from "../../src/slang/core/abstract/utils/connections";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel, BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {OperatorModel} from "../../src/slang/core/models/operator";
import {SlangType} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";

import data from "../resources/definitions.json";

describe("A connection", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;
	let bpNew!: BlueprintModel;
	let bpS2S!: BlueprintModel;
	let bpS2SDlg!: BlueprintModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		const ls = appModel.getChildNode(LandscapeModel);
		if (!ls) {
			throw new Error("landscape not found");
		}
		landscapeModel = ls;
		await appModel.load();

		bpNew = landscapeModel.createBlueprint({uuid: uuidv4(), name: "test-bp-2", type: BlueprintType.Local});
		bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		bpS2SDlg = landscapeModel.findBlueprint("9547e231-26a9-4de0-9b25-b2e1b3fdb1d1")!;
	});

	it("is possible between stream sub and single", () => {
		const streamType = SlangType.newStream(SlangType.newString());
		const bpPortIn = bpNew.createPort({type: streamType, direction: PortDirection.In, name: ""});

		const s2sOp = bpNew.createOperator("s2s", bpS2S, null, null);

		bpPortIn.getStreamSub().connect(s2sOp.getPortIn()!, true);
		expect(bpPortIn.getStreamSub().isConnectedWith(s2sOp.getPortIn()!)).toBeTruthy();
	});

	it("is not possible between stream and single", () => {
		const streamType = SlangType.newStream(SlangType.newString());
		const bpPortIn = bpNew.createPort({type: streamType, direction: PortDirection.In, name: ""});

		const s2sOp = bpNew.createOperator("s2s", bpS2S, null, null);

		expect(() => bpPortIn.connect(s2sOp.getPortIn()!, false)).toThrow();
		expect(bpPortIn.isConnectedWith(s2sOp.getPortIn()!)).toBeFalsy();
	});

	it("does not allow cycles", () => {
		const s2sOp1 = bpNew.createOperator("s2s1", bpS2S, null, null);
		const s2sOp2 = bpNew.createOperator("s2s2", bpS2S, null, null);
		const s2sOp3 = bpNew.createOperator("s2s3", bpS2S, null, null);

		s2sOp1.getPortOut()!.connect(s2sOp2.getPortIn()!, true);
		expect(s2sOp1.getPortOut()!.isConnectedWith(s2sOp2.getPortIn()!)).toBeTruthy();

		s2sOp2.getPortOut()!.connect(s2sOp3.getPortIn()!, true);
		expect(s2sOp2.getPortOut()!.isConnectedWith(s2sOp3.getPortIn()!)).toBeTruthy();

		expect(() => s2sOp3.getPortOut()!.connect(s2sOp1.getPortIn()!, false)).toThrow();
		expect(s2sOp3.getPortOut()!.isConnectedWith(s2sOp1.getPortIn()!)).toBeFalsy();
	});

	it("does not allow delegate cycles aka nested delegates", () => {
		const s2sDlgOp1 = bpNew.createOperator("s2sDlg1", bpS2SDlg, null, null);
		const s2sDlgOp2 = bpNew.createOperator("s2sDlg2", bpS2SDlg, null, null);

		s2sDlgOp1.findDelegate("dlg1")!.getPortOut()!.connect(s2sDlgOp2.getPortIn()!, true);
		expect(s2sDlgOp1.findDelegate("dlg1")!.getPortOut()!.isConnectedWith(s2sDlgOp2.getPortIn()!)).toBeTruthy();

		expect(() => s2sDlgOp2.findDelegate("dlg1")!.getPortOut()!.connect(s2sDlgOp1.getPortIn()!, true)).toThrow();
		expect(s2sDlgOp2.findDelegate("dlg1")!.getPortOut()!.isConnectedWith(s2sDlgOp1.getPortIn()!)).toBeFalsy();
	});

	it("does not allow direction mismatch", () => {
		// TODO!
	});

});

describe("A connections data structure", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;
	let bpNew!: BlueprintModel;
	let op1!: OperatorModel;
	let op2!: OperatorModel;
	let op3!: OperatorModel;

	beforeEach(async () => {
		appModel = AppModel.create("test-app");
		new TestStorageApp(appModel, data);
		const ls = appModel.getChildNode(LandscapeModel);
		if (!ls) {
			throw new Error("landscape not found");
		}
		landscapeModel = ls;
		await appModel.load();

		bpNew = landscapeModel.createBlueprint({uuid: uuidv4(), name: "test-bp-2", type: BlueprintType.Local});
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		op1 = bpNew.createOperator("op1", bpS2S, null, null);
		op2 = bpNew.createOperator("op2", bpS2S, null, null);
		op3 = bpNew.createOperator("op3", bpS2S, null, null);

		op1.getPortOut()!.connect(op2.getPortIn()!, true);
		op2.getPortOut()!.connect(op3.getPortIn()!, true);
	});

	it("can save connections", () => {
		const connections = new Connections();

		const conn1 = {source: op1.getPortOut()!, destination: op2.getPortIn()!};
		const conn2 = {source: op2.getPortOut()!, destination: op3.getPortIn()!};

		connections.add(conn1);
		connections.add(conn2);

		expect(connections).toContain(conn1);
		expect(connections).toContain(conn2);
	});

	it("can save merge connections", () => {
		const connections = new Connections();
		const connections2 = new Connections();

		const conn1 = {source: op1.getPortOut()!, destination: op2.getPortIn()!};
		connections.add(conn1);

		const conn2 = {source: op2.getPortOut()!, destination: op3.getPortIn()!};
		connections2.add(conn2);

		connections.addAll(connections2);

		expect(connections).toContain(conn1);
		expect(connections).toContain(conn2);
	});

	it("can iterate via forEach", () => {
		const connections = new Connections();

		const conn1 = {source: op1.getPortOut()!, destination: op2.getPortIn()!};
		const conn2 = {source: op2.getPortOut()!, destination: op3.getPortIn()!};

		connections.add(conn1);
		connections.add(conn2);

		const contained = new Set<Connection>();
		let count = 0;
		connections.forEach((conn) => {
			contained.add(conn);
			count++;
		});

		expect(count).toEqual(2);

		expect(contained).toContain(conn1);
		expect(contained).toContain(conn2);
	});

});