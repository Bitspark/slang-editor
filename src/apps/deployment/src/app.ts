import {SlangApp} from "../../../slang/app";
import {ApiService} from "../../../slang/core/definitions/api";
import {SlangTypeValue} from "../../../slang/core/definitions/type";
import {AppModel} from "../../../slang/core/models/app";
import {BlueprintInstance, BlueprintModel} from "../../../slang/core/models/blueprint";
import {ComponentFactory} from "../../../slang/ui/factory";

export class DeploymentApp extends SlangApp {
	private api: ApiService;

	constructor(app: AppModel, componentFactory: ComponentFactory, host: string) {
		super(app, componentFactory);
		this.api = new ApiService(host);
	}

	protected onReady(): void {
		this.app.subscribeOpenedBlueprintChanged((blueprint) => {
			if (blueprint === null) {
				return;
			}
			blueprint.subscribeDeploymentRequested(() => {
				this.deploy(blueprint);
			});
			blueprint.subscribeShutdownRequested(() => {
				this.shutdown(blueprint);
			});
			blueprint.subscribeInputPushed((inputData: SlangTypeValue) => {
				this.pushInput(blueprint, inputData);
			});
		});
	}

	private deploy(blueprint: BlueprintModel): void {
		this.api.deployBlueprint(blueprint.getFullName()).then(({url, handle}) => {
			blueprint.deploy({url, handle} as BlueprintInstance);
		});
	}

	private shutdown(blueprint: BlueprintModel): void {
		const access = blueprint.getInstanceAccess();
		if (!access) {
			return;
		}
		this.api.shutdownBlueprintInstance(access.handle).then(() => {
			blueprint.shutdown();
		});
	}

	private pushInput(blueprint: BlueprintModel, inputData: SlangTypeValue): void {
		const access = blueprint.getInstanceAccess();
		if (!access) {
			return;
		}
		this.api.pushInput(access.url, inputData).then((outputData: SlangTypeValue) => {
			blueprint.pushOutput(outputData);
		});
	}
}
