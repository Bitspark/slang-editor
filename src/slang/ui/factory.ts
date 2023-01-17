import {BlueprintModel} from "../core/models";
import {OperatorModel} from "../core/models";
import {UUID} from "../definitions/api";

import {BlackBoxShape, OperatorBox} from "./elements/operator";
import {Canvas} from "./canvas/base";

export class ComponentFactory {
	private readonly blackBoxShape = new Map<UUID, typeof BlackBoxShape>();
	private readonly opCompClasses = new Map<BlueprintModel, new (pv: Canvas, op: OperatorModel) => OperatorBox>();

	public createOperatorBox(paperView: Canvas, operator: OperatorModel): OperatorBox {
		const operatorCompClass = this.opCompClasses.get(operator.getBlueprint());
		if (!operatorCompClass) {
			return new OperatorBox(paperView, operator);
		}
		return new operatorCompClass(paperView, operator);
	}

	public getBlackBoxShape(blueprint: BlueprintModel): typeof BlackBoxShape {
		const newBlackBoxShape = this.blackBoxShape.get(blueprint.uuid);
		if (!newBlackBoxShape) {
			return BlackBoxShape;
		}
		return newBlackBoxShape;

	}

	public registerBlackBoxShape(uuid: UUID, ctr: typeof BlackBoxShape) {
		this.blackBoxShape.set(uuid, ctr);
	}

	public registerOperatorBox(blueprint: BlueprintModel, ctr: new (pv: Canvas, op: OperatorModel) => OperatorBox) {
		this.opCompClasses.set(blueprint, ctr);
	}
}
