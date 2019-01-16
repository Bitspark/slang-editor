import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/model/app";
import {BlackBoxComponent, OperatorBoxComponent} from "../../../slang/ui/components/blackbox";
import {ComponentFactory} from "../../../slang/ui/components/factory";
import {LandscapeModel} from "../../../slang/model/landscape";
import {PaperView} from "../../../slang/ui/views/paper-view";
import {OperatorModel} from "../../../slang/model/operator";
import {BlackBox} from "../../../slang/custom/nodes";
import {PortGroupComponent} from "../../../slang/ui/components/port-group";
import {XY} from "../../../slang/ui/components/base";

export class OperatorValueApp extends SlangApp {
	protected readonly blueprintName = "slang.data.Value";

	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
	}

	protected onReady() {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(this.blueprintName);

		if (!blueprint) {
			throw `unknown blueprintName "${this.blueprintName}"`
		}
		this.componentFactory.registerOperatorComponent(blueprint, ValueOperatorComponent);
	}
}

export class ValueOperatorComponent extends OperatorBoxComponent {
	constructor(paperView: PaperView, operator: OperatorModel) {
		super(paperView, operator);
	}

	protected createShape(blackBox: BlackBox, portGroups: Array<PortGroupComponent>): Shape {
		return new Shape(blackBox, portGroups);
	}

	public refresh(): void {
		super.refresh();
	}

}

export class Shape extends BlackBoxComponent.Rect {
	constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>, position?: XY) {
		super(blackBox, portGroups, position);
		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.resize(120, 24);
	}
}
