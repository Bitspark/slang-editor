import {BlueprintModel} from "../core/models/blueprint";
import {OperatorModel} from "../core/models/operator";

import {BlackBoxShape, OperatorBoxComponent} from "./components/blackbox";
import {PaperView} from "./views/paper-view";

export class ComponentFactory {
	private readonly blackBoxShape = new Map<BlueprintModel, typeof BlackBoxShape>();
	private readonly opCompClasses = new Map<BlueprintModel, new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent>();

	public createOperatorComponent(paperView: PaperView, operator: OperatorModel): OperatorBoxComponent {
		const operatorCompClass = this.opCompClasses.get(operator.getBlueprint());
		if (!operatorCompClass) {
			return new OperatorBoxComponent(paperView, operator);
		}
		return new operatorCompClass(paperView, operator);
	}

	public getBlackBoxShape(blueprint: BlueprintModel): typeof BlackBoxShape {
		const newBlackBoxShape = this.blackBoxShape.get(blueprint);
		if (!newBlackBoxShape) {
			return BlackBoxShape;
		}
		return newBlackBoxShape;

	}

	public registerBlackBoxShape(blueprint: BlueprintModel, ctr: typeof BlackBoxShape) {
		this.blackBoxShape.set(blueprint, ctr);
	}

	public registerOperatorComponent(blueprint: BlueprintModel, ctr: new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent) {
		this.opCompClasses.set(blueprint, ctr);
	}
}
