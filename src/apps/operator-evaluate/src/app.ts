import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/model/app";
import {OperatorBoxComponent} from "../../../slang/ui/components/blackbox";
import {ComponentFactory} from "../../../slang/ui/components/factory";
import {LandscapeModel} from "../../../slang/model/landscape";

export class OperatorEvaluateApp extends SlangApp {
	protected readonly blueprintName = "slang.data.Evaluate";

	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);


	}

	protected onReady() {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(this.blueprintName);

		if (!blueprint) {
			throw `unknown blueprintName "${this.blueprintName}"`
		}
		this.componentFactory.registerOperatorComponent(blueprint, OperatorBoxComponent);
	}
}
