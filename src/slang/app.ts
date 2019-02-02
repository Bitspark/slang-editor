import {AppModel} from "./model/app";
import {ComponentFactory} from "./ui/components/factory";

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
