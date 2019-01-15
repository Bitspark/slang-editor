import {SlangApp} from "../../../app/app";
import {AppModel} from "../../../app/model/app";
import {OperatorBoxComponent} from "../../../app/ui/components/blackbox";
import {ComponentFactory} from "../../../app/ui/components/factory";
import {LandscapeModel} from "../../../app/model/landscape";

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
