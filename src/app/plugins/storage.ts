import {ApiService, BlueprintApiResponse} from "../custom/api";
import {AppModel} from "../model/app";
import {blueprintModelToJSON, fillLandscape} from "../custom/mapper";
import {SlangPlugin} from "./plugin";
import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";

export class APIStoragePlugin extends SlangPlugin {
	private api: ApiService;

	constructor(app: AppModel, host: string) {
		super(app);
		this.api = new ApiService(host);
		this.subscribe();
	}

	private subscribe() {
		this.app.subscribeLoadRequested(() => {
			return this.load();
		});
		this.app.subscribeStoreRequested((blueprint: BlueprintModel) => {
			return this.store(blueprint);
		});

	}

	private async load(): Promise<void> {
		return new Promise<void>(async resolve => {
			fillLandscape(this.app.getChildNode(LandscapeModel)!, await this.api.getBlueprints());
			resolve();
		});
	}

	private store(blueprint: BlueprintModel): void {
		this.api.storeBlueprint(blueprint.getFullName(), blueprintModelToJSON(blueprint)).then(() => {
		});
	}
}

export class StaticStoragePlugin extends SlangPlugin {

	constructor(app: AppModel, private url: string) {
		super(app);
		this.subscribe();
	}

	private subscribe() {
		this.app.subscribeLoadRequested(() => {
			return this.load();
		});
	}

	private async load(): Promise<void> {
		return new Promise<void>(async resolve => {
			fetch(this.url)
				.then((response: Response) => response.json())
				.then(async (data: any) => {
					const objects = data.objects as Array<BlueprintApiResponse>;
					fillLandscape(this.app.getChildNode(LandscapeModel)!, objects);
					resolve();
				});
		});
	}

}
