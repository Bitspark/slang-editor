import {AppModel} from "./core/models/app";
import {ComponentFactory} from "./ui/factory";

export abstract class SlangApp {
	protected constructor(protected app: AppModel, protected componentFactory: ComponentFactory | null) {
		this.app.subscribeReady(((readyState) => {
			if (readyState) {
				this.onReady();
			}
		}));
	}

	protected abstract onReady(): void;
}
