import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/model/app";
import {LandscapeModel} from "../../../slang/model/landscape";
import {ComponentFactory} from "../../../slang/ui/components/factory";

export class RouterApp extends SlangApp {

	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
		this.subscribe();
		this.addEventListeners();
	}

	public checkRoute(): void {
		const url = window.location.pathname;
		const paths = url.split("/");

		if (paths.length <= 2) {
			this.openLandscape();
			return;
		}

		switch (paths[1]) {
			case "blueprint":
				this.openBlueprint(paths[2]);
		}
	}

	protected onReady(): void {
	}

	private openBlueprint(fullName: string) {
		const blueprint = this.app.getChildNode(LandscapeModel)!.findBlueprint(fullName);
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
			if (blueprint !== null) {
				const title = `${blueprint.getFullName()} Blueprint | Slang Studio`;
				const url = `blueprint/${blueprint.getFullName()}`;
				window.history.pushState({type: "blueprint", fullName: blueprint.getFullName()}, title, url);
			}
		});
		this.app.subscribeOpenedLandscapeChanged((blueprint) => {
			if (blueprint !== null) {
				const title = `Blueprint Landscape | Slang Studio`;
				const url = `/`;
				window.history.pushState({type: "landscape"}, title, url);
			}
		});
	}

	private addEventListeners() {
		const that = this;
		window.addEventListener("popstate", () => {
			that.checkRoute();
		});
	}
}
