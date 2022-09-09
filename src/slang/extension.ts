import {SlangAspects} from "./aspects";
import {AppModel} from "./core/models/app";

export abstract class SlangExtension {
	public static register(app: AppModel, aspects: SlangAspects) {
		// @ts-ignore
		return new this(app, aspects);
	}

	protected constructor(protected app: AppModel, protected aspects: SlangAspects) {
		this.app.subscribeReady(((readyState) => {
			if (readyState) {
				this.onReady();
			}
		}));
	}

	protected abstract onReady(): void;
}
