import uuidv4 from "uuid/v4";

import {GenericSpecifications} from "../../src/slang/core/abstract/utils/generics";
import {PropertyAssignments, PropertyModel} from "../../src/slang/core/abstract/utils/properties";
import {AppModel} from "../../src/slang/core/models/app";
import {BlueprintType} from "../../src/slang/core/models/blueprint";
import {LandscapeModel} from "../../src/slang/core/models/landscape";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";
import {TestStorageApp} from "../helpers/TestStorageApp";
import data from "../resources/definitions.json";

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
		const bpValue = landscapeModel.findBlueprint("bbeeeeff-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;

		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-prop-1"},
			type: BlueprintType.Local,
		});

		const gens = new GenericSpecifications(["valueType"]);
		const props = new PropertyAssignments([new PropertyModel("value", SlangType.newGeneric("valueType"))], gens);
		const opValue = bpNew.createOperator("val", bpValue, props, gens);
		const opS2S = bpNew.createBlankOperator(bpS2S);

		gens.specify("valueType", SlangType.newString());

		opValue.getPortOut()!.connect(opS2S.getPortIn()!, true);

		expect(opValue.getPortOut()!.getConnectedWith()).toContain(opS2S.getPortIn()!);
		expect(opValue.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);

		props.get("value").assign("test");

		expect(opValue.getPortOut()!.getConnectedWith()).toContain(opS2S.getPortIn()!);
		expect(opValue.getPortOut()!.getTypeIdentifier()).toEqual(TypeIdentifier.String);
	});

	it("can be expanded properly", () => {
		const bpProps = landscapeModel.findBlueprint("cbc2cb11-c30a-4194-825c-f042902bd18b")!;
		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-prop-2"},
			type: BlueprintType.Local,
		});

		const opProps = bpNew.createBlankOperator(bpProps);

		opProps.getProperties().get("ports").assign(["a", "b", "c"]);

		const subNames = Array.from(opProps.getPortIn()!.getMapSubs())
			.map((sub) => sub.getName());

		expect(subNames.length).toEqual(3);
		["sub_a_number", "sub_a_number", "sub_a_number"].forEach((subName) => {
			expect(subNames).toContain(subName);
		});
	});

	it("can be changed without duplicate generic ports", () => {
		const bpGenProps = landscapeModel.findBlueprint("1e365eba-75c0-416f-883d-dbd2eb802c6a")!;
		const bpS2S = landscapeModel.findBlueprint("ba24c37f-2b04-44b4-97ad-fd931c9ab77b")!;
		const bpNew = landscapeModel.createBlueprint({
			uuid: uuidv4(),
			meta: {name: "test-prop-3"},
			type: BlueprintType.Local,
		});

		const opGenProps1 = bpNew.createBlankOperator(bpGenProps);
		const opS2S1 = bpNew.createBlankOperator(bpS2S);

		const outPort = opS2S1.getPortOut()!;
		const inPort = opGenProps1.getPortIn()!;

		outPort.connect(inPort, true);

		let inPortSub = inPort.getMapSubs().next().value;

		expect(inPort.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(inPort.getMapSubs()).length).toEqual(1);
		expect(inPortSub.isConnected()).toBeTruthy();
		expect(inPortSub.isConnectedWith(outPort)).toBeTruthy();

		opGenProps1.getProperties().get("test").assign("val123");
		inPortSub = inPort.getMapSubs().next().value;

		expect(inPort.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(inPort.getMapSubs()).length).toEqual(1);
		expect(inPortSub.isConnected()).toBeTruthy();
		expect(inPortSub.isConnectedWith(outPort)).toBeTruthy();

		opGenProps1.getProperties().get("test").assign("val321");
		inPortSub = inPort.getMapSubs().next().value;

		expect(inPort.getTypeIdentifier()).toEqual(TypeIdentifier.Map);
		expect(Array.from(inPort.getMapSubs()).length).toEqual(1);
		expect(inPortSub.isConnected()).toBeTruthy();
		expect(inPortSub.isConnectedWith(outPort)).toBeTruthy();
	});

});
