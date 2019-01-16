import {OperatorBoxComponent} from "./blackbox";
import {PaperView} from "../views/paper-view";
import {OperatorModel} from "../../model/operator";
import {BlueprintModel} from "../../model/blueprint";
import {DashboardModuleComponent, PropertyFormDashboardModuleComponent,} from "./dashboard";

export class ComponentFactory {
	private readonly opCompClasses = new Map<BlueprintModel, new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent>();
	private readonly opDashboardModuleClasses = new Map<BlueprintModel, Array<new() => DashboardModuleComponent>>();

	public constructor() {
	}

	public createOperatorComponent(paperView: PaperView, operator: OperatorModel): OperatorBoxComponent {
		const operatorCompClass = this.opCompClasses.get(operator.getBlueprint());
		if (!operatorCompClass) {
			//throw `missing operator component for "${operator.getBlueprint().getFullName()}"`
			return new OperatorBoxComponent(paperView, operator);
		}
		return new operatorCompClass(paperView, operator);
	}

	public getDashboardModules(operator: OperatorModel): Array<new() => DashboardModuleComponent> {
		const dashboardCompClass = this.opDashboardModuleClasses.get(operator.getBlueprint());
		if (!dashboardCompClass) {
			return [PropertyFormDashboardModuleComponent];
		}
		return dashboardCompClass
	}

	public registerOperatorComponent(blueprint: BlueprintModel, ctr: new (pv: PaperView, op: OperatorModel) => OperatorBoxComponent) {
		this.opCompClasses.set(blueprint, ctr);
	}

	public registerOperatorDashboardModules(blueprint: BlueprintModel, modules: Array<new() => DashboardModuleComponent>) {
		this.opDashboardModuleClasses.set(blueprint, modules);
	}
}

export const componentFactory = new ComponentFactory();
