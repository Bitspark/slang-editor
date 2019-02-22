import {SlangAspects} from "./aspects";
import {AppModel} from "./core/models/app";
import {ComponentFactory} from "./ui/factory";

export abstract class SlangApp {
	public constructor(protected app: AppModel, protected aspects: SlangAspects, protected compFactory?: ComponentFactory) {
		this.app.subscribeReady(((readyState) => {
			if (readyState) {
				this.onReady();
			}
		}));
	}

	protected abstract onReady(): void;
}
