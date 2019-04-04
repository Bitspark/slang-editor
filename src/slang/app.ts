import {SlangAspects} from "./aspects";
import {AppModel} from "./core/models/app";

export abstract class SlangApp {
	public constructor(protected app: AppModel, protected aspects: SlangAspects) {
		this.app.subscribeReady(((readyState) => {
			if (readyState) {
				this.onReady();
			}
		}));
	}

	protected abstract onReady(): void;
}
