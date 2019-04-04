import {BlueprintModel} from "../core/models/blueprint";
import {OperatorModel} from "../core/models/operator";

import {BlackBoxShape, OperatorBoxComponent} from "./components/blackbox";
import {DashboardModuleComponent, PropertyFormDashboardModuleComponent} from "./components/dashboard";
import {PaperView} from "./views/paper-view";

export class ComponentFactory {
	private readonly blackBoxShape = new Map<BlueprintModel, typeof BlackBoxShape>();
	private readonly opCompClasses = new Map<BlueprintModel, new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent>();
	private readonly opDashboardModuleClasses = new Map<BlueprintModel, Array<new() => DashboardModuleComponent>>();

	public createOperatorComponent(paperView: PaperView, operator: OperatorModel): OperatorBoxComponent {
		const operatorCompClass = this.opCompClasses.get(operator.getBlueprint());
		if (!operatorCompClass) {
			return new OperatorBoxComponent(paperView, operator);
		}
		return new operatorCompClass(paperView, operator);
	}

	public getDashboardModules(operator: OperatorModel): Array<new() => DashboardModuleComponent> {
		const dashboardCompClass = this.opDashboardModuleClasses.get(operator.getBlueprint());
		if (!dashboardCompClass) {
			return [PropertyFormDashboardModuleComponent];
		}
		return dashboardCompClass;
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

	public registerOperatorDashboardModules(blueprint: BlueprintModel, modules: Array<new() => DashboardModuleComponent>) {
		this.opDashboardModuleClasses.set(blueprint, modules);
	}
}
