import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/core/models/app";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {LandscapeModel} from "../../../slang/core/models/landscape";
import {OperatorModel} from "../../../slang/core/models/operator";
import {TypeIdentifier} from "../../../slang/definitions/type";
import {BlackBoxShape, BlackBoxShapeAttrs} from "../../../slang/ui/components/blackbox";
import {ComponentFactory} from "../../../slang/ui/components/factory";

export class OperatorDataApp extends SlangApp {
	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
	}

	protected getBlueprint(uuid: string): BlueprintModel {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(uuid);
		if (!blueprint) {
			throw new Error(`unknown blueprintName "${uuid}"`);
		}
		return blueprint;
	}

	protected register(uuid: string, ctr: typeof BlackBoxShape) {
		try {
			this.componentFactory!.registerBlackBoxShape(this.getBlueprint(uuid), ctr);
		} catch (e) {
			return;
		}
	}

	protected onReady() {
		// slang.data.Value
		this.register("8b62495a-e482-4a3e-8020-0ab8a350ad2d", ValueBlackBoxShape);
		// slang.data.Evaluate
		this.register("37ccdc28-67b0-4bb1-8591-4e0e813e3ec1", EvalBlackBoxShape);
		// slang.data.Convert
		this.register("d1191456-3583-4eaf-8ec1-e486c3818c60", ConvertBlackBoxShape);
	}
}

class DataBlackBoxShape extends BlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.attr("label/font-size", 9);
		this.resize(120, 25);
	}
}

class ValueBlackBoxShape extends DataBlackBoxShape {
	public setupForOperator(operator: OperatorModel) {
		super.setupForOperator(operator);

		const value = operator.getPropertyValue("value");
		const label = (typeof value !== "undefined") ? JSON.stringify(value) : "value?";
		const maxLength = 24;

		this.attr("label/text",
			label.length <= maxLength ? label :
				`${label.substr(0, maxLength - 2)}...`,
		);
	}
}

class EvalBlackBoxShape extends DataBlackBoxShape {
	public setupForOperator(operator: OperatorModel) {
		super.setupForOperator(operator);

		const expr = operator.getPropertyValue("expression");
		const label = (typeof expr !== "undefined") ? (expr as string) : "expression?";
		const maxLength = 24;

		this.attr("label/text",
			label.length <= maxLength ? label :
				`${label.substr(0, maxLength - 2)}...`,
		);
	}
}

class ConvertBlackBoxShape extends DataBlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.attr("label/font-size", 9);
		this.resize(80, 25);
	}

	public setupForOperator(operator: OperatorModel) {
		super.setupForOperator(operator);

		const portIn = operator.getPortIn();
		const portOut = operator.getPortOut();

		if (!portIn || !portOut) {
			return;
		}

		const fromType = TypeIdentifier[portIn.getTypeIdentifier()];
		const toType = TypeIdentifier[portOut.getTypeIdentifier()];

		this.attr("label/text", `${fromType} → ${toType}`);
	}
}
