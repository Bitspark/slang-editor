import {SlangApp} from "../../../slang/app";
import {SlangAspects} from "../../../slang/aspects";
import {AppModel} from "../../../slang/core/models/app";
import {BlueprintInstance, BlueprintModel} from "../../../slang/core/models/blueprint";
import {ApiService} from "../../../slang/definitions/api";
import {SlangTypeValue} from "../../../slang/definitions/type";

export class DeploymentApp extends SlangApp {
	private api: ApiService;

	constructor(app: AppModel, aspect: SlangAspects, host: string) {
		super(app, aspect);
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
		this.api.deployBlueprint(blueprint.uuid).then(({url, handle}) => {
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
