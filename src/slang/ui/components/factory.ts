import {OperatorBoxComponent} from "./blackbox";
import {PaperView} from "../views/paper-view";
import {OperatorModel} from "../../model/operator";
import {BlueprintModel} from "../../model/blueprint";

export class ComponentFactory {
	private readonly operatorBoxClasses = new Map<BlueprintModel, new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent>();

	public constructor() {
	}

	public createOperatorComponent(paperView: PaperView, operator: OperatorModel): OperatorBoxComponent {
		const operatorBoxClass = this.operatorBoxClasses.get(operator.getBlueprint());
		if (!operatorBoxClass) {
			//throw `missing operator component for "${operator.getBlueprint().getFullName()}"`
			return new OperatorBoxComponent(paperView, operator);
		}
		return new operatorBoxClass(paperView, operator);
	}

	public registerOperatorComponent(blueprint: BlueprintModel, ctr: new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent) {
		this.operatorBoxClasses.set(blueprint, ctr);
	}
}

export const componentFactory = new ComponentFactory();
