import {SlangApp} from "../../../app/app";
import {ApiService, BlueprintApiResponse} from "../../../app/custom/api";
import {AppModel} from "../../../app/model/app";
import {BlueprintModel} from "../../../app/model/blueprint";
import {blueprintModelToJSON, fillLandscape} from "../../../app/custom/mapper";
import {LandscapeModel} from "../../../app/model/landscape";
import {ComponentFactory} from "../../../app/ui/components/factory";

export class APIStorageApp extends SlangApp {
	private api: ApiService;

	constructor(app: AppModel, componentFactory: ComponentFactory, host: string) {
		super(app, componentFactory);
		this.api = new ApiService(host);
		this.subscribe();
	}

	protected onReady(): void {
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

export class StaticStorageApp extends SlangApp {

	constructor(app: AppModel, componentFactory: ComponentFactory, private url: string) {
		super(app, componentFactory);
		this.subscribe();
	}

	protected onReady(): void {
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
