import {ApiService} from "../custom/api";
import {AppModel} from "../model/app";
import {SlangPlugin} from "./plugin";
import {BlueprintInstance, BlueprintModel} from "../model/blueprint";

export class DeploymentPlugin extends SlangPlugin {
	private api: ApiService;

	constructor(app: AppModel, host: string) {
		super(app);
		this.api = new ApiService(host);
		this.subscribe();
	}

	private subscribe() {
		this.app.subscribeOpenedBlueprintChanged(blueprint => {
			if (blueprint !== null) {
				blueprint.subscribeDeploymentRequested(() => {
					this.deploy(blueprint);
				});
				blueprint.subscribeShutdownRequested(() => {
					this.shutdown(blueprint);
				});
			}
		});
	}

	private deploy(blueprint: BlueprintModel): void {
		this.api.deployBlueprint(blueprint.getFullName()).then(({url, handle}) => {
			blueprint.deploy({url, handle} as BlueprintInstance);
		});
	}

	private shutdown(blueprint: BlueprintModel): void {
		const access = blueprint.getInstanceAccess();
		if (access) {
			this.api.shutdownBlueprintInstance(access.handle).then(() => {
				blueprint.shutdown();
			});
		}

	}
}

