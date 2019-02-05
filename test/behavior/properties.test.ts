import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {TestStorageApp} from "../helpers/TestStorageApp";

import data from "../resources/definitions.json";
import {GenericSpecifications} from "../../src/slang/core/abstract/utils/generics";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";
import {PropertyAssignments, PropertyModel} from "../../src/slang/core/abstract/utils/properties";

describe("A property", () => {
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

	it("can be changed while retaining type and connections", () => {
		const bpValue = landscapeModel.findBlueprint("Value")!;
		const bpS2S = landscapeModel.findBlueprint("StringToString")!;

		const bpNew = landscapeModel.createBlueprint({fullName: "test-prop-1", type: BlueprintType.Local});

		const gens = new GenericSpecifications(["valueType"]);
		const props = new PropertyAssignments([new PropertyModel("value", SlangType.newGeneric("valueType"))], gens);
		const opValue = bpNew.createOperator("val", bpValue, props, gens);
		const opS2S = bpNew.createOperator("s2s", bpS2S, null, null);

		gens.specify("valueType", SlangType.newString());

		opValue.getPortOut()!.connect(opS2S.getPortIn()!, true);

		expect(opValue.getPortOut()!.getConnectedWith()).toContain(opS2S.getPortIn()!);
		expect(opValue.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);

		props.get("value").assign("test");

		expect(opValue.getPortOut()!.getConnectedWith()).toContain(opS2S.getPortIn()!);
		expect(opValue.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);
	});
});
