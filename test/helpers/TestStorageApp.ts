import {SlangApp} from "../../src/slang/app";
import {fillLandscape} from "../../src/slang/core/mapper";
import {AppModel} from "../../src/slang/core/models/app";
import {LandscapeModel} from "../../src/slang/core/models/landscape";

export class TestStorageApp extends SlangApp {

	constructor(app: AppModel, private objects: any) {
		super(app, null);
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
			fillLandscape(this.app.getChildNode(LandscapeModel)!, this.objects);
			resolve();
		});
	}
}
