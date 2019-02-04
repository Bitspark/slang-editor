import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/model/app";
import {ComponentFactory} from "../../../slang/ui/components/factory";
import {LandscapeModel} from "../../../slang/model/landscape";
import {OperatorModel} from "../../../slang/model/operator";
import {BlackBoxShape, BlackBoxShapeAttrs} from "../../../slang/ui/components/blackbox";
import {BlueprintModel} from "../../../slang/model/blueprint";
import {TypeIdentifier} from "../../../slang/custom/type";

export class OperatorDataApp extends SlangApp {
	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
	}

	protected getBlueprint(blueprintName: string): BlueprintModel {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(blueprintName);
		if (!blueprint) {
			throw `unknown blueprintName "${blueprintName}"`
		}
		return blueprint;

	}

	protected register(blueprintName: string, ctr: typeof BlackBoxShape) {
		this.componentFactory!.registerBlackBoxShape(this.getBlueprint(blueprintName), ctr);
	}

	protected onReady() {
		this.register("slang.data.Value", ValueBlackBoxShape);
		this.register("slang.data.Evaluate", EvalBlackBoxShape);
		this.register("slang.data.Convert", ConvertBlackBoxShape);
	}
}


class DataBlackBoxShape extends BlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.attr("label/font-size", 9);
		this.resize(120, 24);
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
				`${label.substr(0, maxLength - 2)}...`
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
				`${label.substr(0, maxLength - 2)}...`
		);
	}
}

class ConvertBlackBoxShape extends DataBlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.attr("label/font-size", 9);
		this.resize(80, 24);
	}
	public setupForOperator(operator: OperatorModel) {
		super.setupForOperator(operator);

		const portIn = operator.getPortIn();
		const portOut = operator.getPortOut();

		if (portIn && portOut) {
			const fromType = TypeIdentifier[portIn.getTypeIdentifier()];
			const toType = TypeIdentifier[portOut.getTypeIdentifier()];
			this.attr("label/text", `${fromType} → ${toType}`);
		}
	}
}
