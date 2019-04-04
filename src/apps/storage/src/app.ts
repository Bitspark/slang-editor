import {SlangApp} from "../../../slang/app";
import {SlangAspects} from "../../../slang/aspects";
import {blueprintModelToJson, loadBlueprints} from "../../../slang/core/mapper";
import {AppModel} from "../../../slang/core/models/app";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {LandscapeModel} from "../../../slang/core/models/landscape";
import {ApiService, BlueprintsJson} from "../../../slang/definitions/api";

export class APIStorageApp extends SlangApp {
	private api: ApiService;

	constructor(app: AppModel, aspect: SlangAspects, url: string) {
		super(app, aspect);
		this.api = new ApiService(url);
		this.subscribe();
	}

	protected onReady(): void {
		return;
	}

	private subscribe() {
		this.app.subscribeLoadRequested(() => {
			return this.load();
		});
		this.app.subscribeStoreRequested((blueprint: BlueprintModel) => {
			this.store(blueprint);
		});
	}

	private async load(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			loadBlueprints(this.app.getChildNode(LandscapeModel)!, await this.api.getBlueprints());
			resolve();
		});
	}

	private store(blueprint: BlueprintModel): void {
		this.api.storeBlueprint(blueprintModelToJson(blueprint)).then(() => {
			return;
		});
	}
}

export class StaticStorageApp extends SlangApp {
	constructor(app: AppModel, aspect: SlangAspects, private url: string) {
		super(app, aspect);
		this.subscribe();
	}

	protected onReady(): void {
		return;
	}

	private subscribe() {
		this.app.subscribeLoadRequested(() => {
			return this.load();
		});
	}

	private async load(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			fetch(this.url)
				.then((response: Response) => response.json())
				.then(async (data: any) => {
					const objects = data.objects as BlueprintsJson;
					loadBlueprints(this.app.getChildNode(LandscapeModel)!, objects);
					resolve();
				});
		});
	}
}
