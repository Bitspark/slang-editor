import uuidv4 from "uuid/v4";

import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintModel, BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {OperatorModel} from "../../src/slang/core/models/operator";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

describe("A blueprint delegate", () => {
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

	it("can be loaded in blueprint", () => {
		const dlgBp = landscapeModel.findBlueprint("9547e231-26a9-4de0-9b25-b2e1b3fdb1d1")!;
		expect(dlgBp).toBeTruthy();

		const dlg = dlgBp.findDelegate("dlg1");
		expect(dlg).toBeTruthy();
	});
});

describe("An operator delegate", () => {
	let appModel: AppModel;
	let landscapeModel: LandscapeModel;

	let bpNew!: BlueprintModel;
	let dlgBp!: BlueprintModel;
	let s2sBp!: BlueprintModel;
	let dlgOp!: OperatorModel;
	let s2sOp!: OperatorModel;

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

		dlgBp = landscapeModel.findBlueprint("9547e231-26a9-4de0-9b25-b2e1b3fdb1d1")!;
		s2sBp = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		dlgOp = bpNew.createOperator("dlg", dlgBp, null, null);
		s2sOp = bpNew.createOperator("s2s1", s2sBp, null, null);
	});

	it("has port positions", () => {
		const dlgBpDlg = dlgBp.findDelegate("dlg1")!;

		expect(dlgBpDlg.inPosition).toEqual(0);
		expect(dlgBpDlg.outPosition).toEqual(0);

		dlgBpDlg.inPosition = 10;
		expect(dlgBpDlg.inPosition).toEqual(10);

		dlgBpDlg.outPosition = 20;
		expect(dlgBpDlg.outPosition).toEqual(20);
	});

	it("can be connected", () => {
		const dlgOpDlg = dlgOp.findDelegate("dlg1")!;
		expect(dlgOpDlg).toBeTruthy();

		const dlgOpDlgPortOut = dlgOpDlg.getPortOut()!;
		expect(dlgOpDlgPortOut).toBeTruthy();
		const dlgOpDlgPortIn = dlgOpDlg.getPortIn()!;
		expect(dlgOpDlgPortIn).toBeTruthy();

		dlgOpDlgPortOut.connect(s2sOp.getPortIn()!, true);
		s2sOp.getPortOut()!.connect(dlgOpDlgPortIn, true);

		expect(dlgOpDlgPortOut.isConnectedWith(s2sOp.getPortIn()!));
		expect(s2sOp.getPortOut()!.isConnectedWith(dlgOpDlgPortIn));
	});

	it("return correct connections", () => {
		const dlgOpDlg = dlgOp.findDelegate("dlg1")!;
		const dlgOpDlgPortOut = dlgOpDlg.getPortOut()!;
		const dlgOpDlgPortIn = dlgOpDlg.getPortIn()!;

		dlgOpDlgPortOut.connect(s2sOp.getPortIn()!, true);
		s2sOp.getPortOut()!.connect(dlgOpDlgPortIn, true);

		expect(Array.from(dlgOpDlg.getConnectionsTo()).length).toEqual(1);
		expect(Array.from(dlgOpDlg.getConnections()).length).toEqual(2);
	});

});
