import {SlangApp} from "../../src/slang/app";
import {BlueprintApiResponse} from "../../src/slang/core/definitions/api";
import {fillLandscape} from "../../src/slang/core/utils/mapper";
import {AppModel} from "../../src/slang/core/models/app";
import {LandscapeModel} from "../../src/slang/core/models/landscape";

export class TestStorageApp extends SlangApp {

	constructor(app: AppModel, private objects: BlueprintApiResponse[]) {
		super(app, null);
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
		return new Promise<void>(async (resolve) => {
			fillLandscape(this.app.getChildNode(LandscapeModel)!, this.objects);
			resolve();
		});
	}
}
