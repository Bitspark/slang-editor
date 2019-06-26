import m, {CVnode} from "mithril";

import {SlangApp} from "../../slang/app";
import {toTypeIdentifier} from "../../slang/core/mapper";
import {BlueprintModel} from "../../slang/core/models/blueprint";
import {LandscapeModel} from "../../slang/core/models/landscape";
import {OperatorModel} from "../../slang/core/models/operator";
import {SlangType, TypeIdentifier} from "../../slang/definitions/type";
import {BlackBoxShape, BlackBoxShapeAttrs} from "../../slang/ui/components/blackbox";
import {DashboardModuleAttrs, DashboardModuleComponent} from "../../slang/ui/components/dashboard";
import {SelectInput} from "../../slang/ui/components/toolkit/input";
import {Block} from "../../slang/ui/components/toolkit/toolkit";

const ROUND_CORNER = 12;
const FONT_SIZE = 9;

export interface SlangAspectImpl {
	shape?: typeof BlackBoxShape;
	dashboardModules?: Array<new() => DashboardModuleComponent>;
}

export class OperatorDataApp extends SlangApp {
	protected getBlueprint(uuid: string): BlueprintModel {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(uuid);
		if (!blueprint) {
			throw new Error(`unknown blueprintName "${uuid}"`);
		}
		return blueprint;
	}

	protected register(uuid: string, aspectImpl: SlangAspectImpl) {
		let bp: BlueprintModel;
		try {
			bp = this.getBlueprint(uuid);
		} catch {
			return;
		}

		const factory = this.aspects.factory;
		if (aspectImpl.shape) {
			factory.registerBlackBoxShape(bp, aspectImpl.shape);
		}
		if (aspectImpl.dashboardModules && aspectImpl.dashboardModules.length > 0) {
			factory.registerOperatorDashboardModules(bp, aspectImpl.dashboardModules);
		}
	}

	protected onReady() {
		// slang.data.Value
		this.register("8b62495a-e482-4a3e-8020-0ab8a350ad2d", ValueOperator);
		// slang.data.Evaluate
		this.register("37ccdc28-67b0-4bb1-8591-4e0e813e3ec1", EvalOperator);
		// slang.data.Convert
		this.register("d1191456-3583-4eaf-8ec1-e486c3818c60", ConvertOperator);
	}
}

class DataBlackBoxShape extends BlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);

		const width = 120;
		const height = 25;

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
			const maxLength = 24;

			const dots = "...";
			this.attr("label/text",
				label.length <= maxLength ? label :
					`${label.substr(0, maxLength - dots.length)}${dots}`,
			);
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

			const width = 80;
			const height = 25;

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

	public static dashboardModules = [class implements DashboardModuleComponent {
		private operator!: OperatorModel;
		private readonly portTypeOptions = [
			TypeIdentifier[TypeIdentifier.Unspecified],
			TypeIdentifier[TypeIdentifier.Binary],
			TypeIdentifier[TypeIdentifier.Number],
			TypeIdentifier[TypeIdentifier.String],
			TypeIdentifier[TypeIdentifier.Boolean],
		];

		public oninit({attrs}: CVnode<DashboardModuleAttrs>): any {
			this.operator = attrs.operator;
		}

		public setPortType(genName: string, opt: string) {
			if (this.portTypeOptions.indexOf(opt) < 0) {
				return;
			}

			const opr = this.operator;
			const genSpec = opr.getGenerics();
			try {
				genSpec.specify(genName, SlangType.new(toTypeIdentifier(opt)));
			} catch {
				genSpec.specify(genName, SlangType.newUnspecified());
			}
		}

		public view({}: CVnode<DashboardModuleAttrs>): any {
			const opr = this.operator;

			const portIn = opr.getPortIn()!;
			const typeIn = portIn.getTypeIdentifier();
			const fixedIn = portIn.isConnected();
			const portOut = opr.getPortOut()!;
			const typeOut = portOut.getTypeIdentifier();
			const fixedOut = portOut.isConnected();

			return m(Block,
				m(".sl-inp-grp-inline",
					m(SelectInput, {
						selected: TypeIdentifier[typeIn],
						options: (fixedIn) ? [TypeIdentifier[typeIn]] : this.portTypeOptions,
						onInput: (fixedIn) ? () => null :
							(opt: string) => {
								this.setPortType("fromType", opt);
							},
					}),
					"→",
					m(SelectInput, {
						selected: TypeIdentifier[typeOut],
						options: (fixedOut) ? [TypeIdentifier[typeOut]] : this.portTypeOptions,
						onInput: (fixedOut) ? () => null :
							(opt: string) => {
								this.setPortType("toType", opt);
							},
					}),
				),
			);
		}
	}];
}
