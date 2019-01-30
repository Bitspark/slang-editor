import {SlangApp} from "../../src/slang/app";
import {AppModel} from "../../src/slang/model/app";
import {BlueprintApiResponse} from "../../src/slang/custom/api";
import {fillLandscape} from "../../src/slang/custom/mapper";
import {LandscapeModel} from "../../src/slang/model/landscape";

export class TestStorageApp extends SlangApp {

	constructor(app: AppModel, private objects: Array<BlueprintApiResponse>) {
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
		return new Promise<void>(async resolve => {
			fillLandscape(this.app.getChildNode(LandscapeModel)!, this.objects);
			resolve();
		});
	}
}
