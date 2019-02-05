import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TestStorageApp} from "../helpers/TestStorageApp";

import data from "../resources/definitions.json";

describe("A delegate", () => {
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
		const dlgOp = landscapeModel.findBlueprint("StringToPrimitiveDelegate")!;
		expect(dlgOp).toBeTruthy();

		const dlg = dlgOp.findDelegate("dlg1");
		expect(dlg).toBeTruthy();
	});

	it("can be loaded in operator and connected", () => {
		const bpNew = landscapeModel.createBlueprint({fullName: "test-bp-2", type: BlueprintType.Local});

		const dlgBp = landscapeModel.findBlueprint("StringToPrimitiveDelegate")!;
		const s2sBp = landscapeModel.findBlueprint("StringToString")!;

		const dlgOp = bpNew.createOperator("dlg", dlgBp, null, null);
		const s2sOp = bpNew.createOperator("s2s", s2sBp, null, null);

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

});
