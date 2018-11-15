import {ApiService} from "../custom/api";
import {AppModel} from "../model/app";
import {SlangPlugin} from "./plugin";
import {BlueprintInstanceAccess, BlueprintModel} from "../model/blueprint";

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
				blueprint.subscribeDeploymentTriggered(() => {
					this.deploy(blueprint);
				})
			}
		});
	}

	private deploy(blueprint: BlueprintModel): void {
		this.api.deploy(blueprint.getFullName()).then(({url, handle}) => {
			blueprint.run({url, handle} as BlueprintInstanceAccess);
		});
	}
}

