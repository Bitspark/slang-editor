import {SlangExtension} from "../../slang/extension";
import {BlueprintModel, LandscapeModel, OperatorModel} from "../../slang/core/models";
import {UUID} from "../../slang/definitions/api";
import {SlangTypeStream, TypeIdentifier} from "../../slang/definitions/type";
import {BlackBoxShape, BlackBoxShapeAttrs} from "../../slang/ui/elements/operator";

const ROUND_CORNER = 1;
const FONT_SIZE = 8;

export interface SlangAspectImpl {
	shape?: typeof BlackBoxShape;
}

export class OperatorDataExt extends SlangExtension {
	protected getBlueprint(uuid: string): BlueprintModel {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(uuid);
		if (!blueprint) {
			throw new Error(`unknown blueprintName "${uuid}"`);
		}
		return blueprint;
	}

	protected registerBlackBox(uuid: UUID, aspectImpl: SlangAspectImpl) {
		if (aspectImpl.shape) {
			const factory = this.aspects.factory;
			factory.registerBlackBoxShape(uuid, aspectImpl.shape);
		}
	}

	protected onReady() {
		// slang.data.ValueSet & slang.data.ValueGet
		this.registerBlackBox("3be41b5b-5a43-4f94-a7ae-7f0bacc4ae77", ValueSetOperator);
		this.registerBlackBox("b8771c73-cddf-4eb1-a10c-bf78c2552efe", ValueGetOperator);
		// slang.data.Value
		this.registerBlackBox("8b62495a-e482-4a3e-8020-0ab8a350ad2d", ValueOperator);
		// slang.data.Evaluate
		this.registerBlackBox("37ccdc28-67b0-4bb1-8591-4e0e813e3ec1", EvalOperator);
		// slang.data.Convert
		this.registerBlackBox("d1191456-3583-4eaf-8ec1-e486c3818c60", ConvertOperator);
		// Log
		this.registerBlackBox("8f9c02df-da41-4266-b486-0c22173a6383", LogOperator);
		// Switch
		this.registerBlackBox("cd6fc5c8-5b64-4b1a-9885-59ede141b398", SwitchOperator);
	}
}

class DataBlackBoxShape extends BlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		const width = 120;
		const height = 24;

		this.attr("body/rx", ROUND_CORNER);
		this.attr("body/ry", ROUND_CORNER);
		this.attr("label/font-size", FONT_SIZE);
		this.resize(width, height);
	}
}

class ValueOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		public setupForOperator(operator: OperatorModel) {
			super.setupForOperator(operator);

			const value = operator.getPropertyValue("value");
			const label = (typeof value !== "undefined") ? JSON.stringify(value) : "value?";
			this.attr("label/text", label);

			const width = Math.max(70, label.length*3.8)
			const height = 24;
			this.resize(width, height);

			this.attr("body/rx", 1);
			this.attr("body/ry", 1);

			/*
			const dots = "...";
			const maxLength = 24;
			this.attr("label/text",
				label.length <= maxLength ? label :
					`${label.substr(0, maxLength - dots.length)}${dots}`,
			);
			 */
		}
	};

}

class ValueSetOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		public setupForOperator(operator: OperatorModel) {
			super.setupForOperator(operator);

			const value = operator.getPropertyValue("valueName");
			const label = `SET "${value}"`;


			this.attr("label/text", label);

			const width = 100;
			const height = 24;
			this.resize(width, height);
		}
	};

}

class ValueGetOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		public setupForOperator(operator: OperatorModel) {
			super.setupForOperator(operator);

			const value = operator.getPropertyValue("valueName");
			const label = `GET "${value}"`;

			this.attr("label/text", label);

			const width = 100;
			const height = 24;
			this.resize(width, height);
		}
	};

}

class EvalOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		public setupForOperator(operator: OperatorModel) {
			super.setupForOperator(operator);

			const expr = operator.getPropertyValue("expression");
			const label = (typeof expr !== "undefined") ? (expr as string) : "expression?";
			const maxLength = 24;

			const dots = "...";
			this.attr("label/text",
				label.length <= maxLength ? label :
					`${label.substr(0, maxLength - dots.length)}${dots}`,
			);
		}
	};
}

class ConvertOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		constructor(attrs: BlackBoxShapeAttrs) {
			super(attrs);

			const width = 70;
			const height = 24;

			this.attr("body/rx", ROUND_CORNER);
			this.attr("body/ry", ROUND_CORNER);
			this.attr("label/font-size", FONT_SIZE);
			this.resize(width, height);
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
	};
}

class LogOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		constructor(attrs: BlackBoxShapeAttrs) {
			super(attrs);

			const width = 40;
			const height = 24;

			this.attr("label/font-size", FONT_SIZE);
			this.resize(width, height);
		}
	};
}

class SwitchOperator implements SlangAspectImpl {
	public static shape = class extends DataBlackBoxShape {
		constructor(attrs: BlackBoxShapeAttrs) {
			super(attrs);

			/*
			const width = 80;
			const height = 200;



			this.attr("label/font-size", FONT_SIZE);
			this.resize(width, height);
			 */
		}

		public setupForOperator(operator: OperatorModel) {
			super.setupForOperator(operator);
			const propertyCases = operator.getPropertyValue("cases") as SlangTypeStream

			const width = 80;
			const height = 40 * ((propertyCases?.length) ? propertyCases.length : 1)

			this.resize(width, height);
		}
	};

}
