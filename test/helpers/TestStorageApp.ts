import {SlangApp} from "../../src/slang/app";
import {loadBlueprints} from "../../src/slang/core/mapper";
import {AppModel} from "../../src/slang/core/models/app";
import {LandscapeModel} from "../../src/slang/core/models/landscape";

export class TestStorageApp extends SlangApp {

	constructor(app: AppModel, private objects: any) {
		super(app, null!);
		this.load();
	}

	protected onReady(): void {
		return;
	}

	private load(): void {
		loadBlueprints(this.app.getChildNode(LandscapeModel)!, this.objects.local);
	}
}
