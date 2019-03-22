import {SlangApp} from "../../../slang/app";
import {SlangAspects} from "../../../slang/aspects";
import {AppModel} from "../../../slang/core/models/app";
import {LandscapeModel} from "../../../slang/core/models/landscape";

export class RouterApp extends SlangApp {

	constructor(app: AppModel, aspect: SlangAspects) {
		super(app, aspect);
		this.subscribe();
		this.addEventListeners();
	}

	public checkRoute(): void {
		const url = window.location.pathname;
		const paths = url.split("/");
		const blueprintPathDepth = 2;
		if (paths.length <= blueprintPathDepth) {
			this.openLandscape();
			return;
		}
		switch (paths[1]) {
			case "blueprint":
				this.openBlueprint(paths[blueprintPathDepth]);
		}
	}

	protected onReady(): void {
		return;
	}

	private openBlueprint(uuid: string) {
		const blueprint = this.app.getChildNode(LandscapeModel)!.findBlueprint(uuid);
		if (blueprint) {
			blueprint.open();
		}
	}

	private openLandscape() {
		this.app.getChildNode(LandscapeModel)!.open();
	}

	private subscribe(): void {
		this.app.subscribeLoadRequested((): Promise<void> => {
			return new Promise<void>((resolve) => {
				this.checkRoute();
				resolve();
			});
		});
		this.app.subscribeOpenedBlueprintChanged((blueprint) => {
			if (blueprint === null) {
				return;
			}
			const title = `${blueprint.name} Blueprint | Slang Studio`;
			const uuid = blueprint.uuid;
			const url = `blueprint/${uuid}`;
			window.history.pushState({uuid, type: "blueprint"}, title, url);
		});
		this.app.subscribeOpenedLandscapeChanged((blueprint) => {
			if (blueprint === null) {
				return;
			}
			const title = `Blueprint Landscape | Slang Studio`;
			const url = `/`;
			window.history.pushState({type: "landscape"}, title, url);
		});
	}

	private addEventListeners() {
		const that = this;
		window.addEventListener("popstate", () => {
			that.checkRoute();
		});
	}
}
