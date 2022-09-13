// @ts-ignore
import styling from "../styles/app.scss";

// tslint:disable-next-line
// import {AutoTriggerApp} from "../apps/autotrigger/src/app";
// import {DeploymentApp} from "../apps/deployment/src/app";
// import {OperatorDataApp} from "../apps/operators/app";
// import {BlueprintShareApp} from "../apps/share/src/app";
// import {APIStorageApp} from "../apps/storage/src/app";
import { View } from "../slang/ui/views/view";
import {SlangAspects} from "../slang/aspects";
import {AppModel, BlueprintModel, LandscapeModel} from "../slang/core/models";
import {ViewFrame} from "../slang/ui/frame";
import {BlueprintView} from "../slang/ui/views/blueprint";
//import {LandscapeView} from "../slang/ui/views/landscape";
import {PaperViewArgs} from "../slang/ui/views/paper-view";
import { ApiService } from "./services";
import { blueprintModelToJson, loadBlueprints } from "../slang/core/mapper";
import { OperatorDataExt } from "../extensions/operators";

class Slang {
	private readonly frames: ViewFrame[] = [];
	private outlet: ViewFrame | null = null;
	private defaultViewArgs: PaperViewArgs | null = null;
	private landscape: LandscapeModel;
	private extensions = [
		OperatorDataExt,
	]

	constructor(private app: AppModel, private aspects: SlangAspects, private api: ApiService) {
		this.landscape = app.createLandscape();
	}

	public setDefaultViewArgs(defaultViewArgs: PaperViewArgs | null) {
		this.defaultViewArgs = defaultViewArgs;
	}

	public addFrame(frame: ViewFrame, outlet: boolean = false): void {
		this.frames.push(frame);
		if (outlet) {
			this.outlet = frame;
		}
	}

	public setOutlet(frame: ViewFrame): void {
		if (this.frames.indexOf(frame) === -1) {
			throw new Error(`outlet has to be owned by the app`);
		}
		this.outlet = frame;
	}

	public async load(): Promise<void> {
		loadBlueprints(this.landscape, await this.api.getBlueprints());
		this.extensions.forEach(extClass => extClass.register(this.app, this.aspects))
		this.subscribe();
        return Promise.resolve();
	}

    public displayView(view: View): void {
        if(!this.outlet) {
			throw new Error(`outlet is not attached`);
        }
        this.outlet.setView(view)
    }

	/*
	public async load(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			loadBlueprints(this.app.getChildNode(LandscapeModel)!, await this.api.getBlueprints());
			resolve();
		});
	}
	*/

	public store(blueprint: BlueprintModel): void {
		this.api.storeBlueprint(blueprintModelToJson(blueprint)).then(() => {
			return;
		});
	}

	private subscribe(): void {
        this.app.subscribeReady(async (readyState) => {
            if (!readyState) {
                return;
            }


			const blueprint = this.landscape.findBlueprint("a39a873e-dfb9-4ac9-ab12-24cb1051a4bb")!

			const viewArgs = this.defaultViewArgs || {
				editable: blueprint.isLocal(),
				hscrollable: true,
				vscrollable: true,
				descendable: true,
				runnable: true,
			};

            const blueprintView = new BlueprintView(this.outlet!, this.aspects, blueprint, viewArgs);
            this.displayView(blueprintView);
        })

        /*
		this.app.subscribeOpenedBlueprintChanged((blueprint) => {
			if (!blueprint || !this.outlet) {
				return;
			}

			const viewArgs = this.defaultViewArgs || {
				editable: blueprint.isLocal(),
				hscrollable: true,
				vscrollable: true,
				descendable: true,
				runnable: true,
			};

			const view = new BlueprintView(this.outlet, blueprint, viewArgs);
			this.outlet.setView(view);
		});

		this.app.subscribeOpenedLandscapeChanged((landscape) => {
			if (!landscape || !this.outlet) {
				return;
			}
			const view = new LandscapeView(
				this.outlet,
				landscape,
				((bp) => bp.isLocal()) as (bp: BlueprintModel) => boolean);
			this.outlet.setView(view);
		});
        */
	}
}


declare const APIURL: string;

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const aspects = new SlangAspects();
		const api = new ApiService(APIURL);
		const app = new Slang(appModel, aspects, api);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

        /*
		api.subscribeConnected(() => {
			console.info("connected");
		});
		api.subscribeReconnecting(() => {
			console.info("reconnecting");
		});
		api.subscribeDisconnected(() => {
			console.info("disconnected");
		});
		api.subscribeReconnected(() => {
			console.info("reconnected");
		});
        */

		app.load().then(() => {
            /*
			const mainLandscape = appModel.getChildNode(LandscapeModel)!;
			mainLandscape.open();

			if (gotoLandEl) {
				gotoLandEl.style.display = "none";

				gotoLandEl.onclick = () => {
					mainLandscape.open();
				};

				appModel.subscribeOpenedBlueprintChanged((blueprint) => {
					gotoLandEl.style.display = blueprint ? "" : "none";
				});
			}

            */
			resolve();
		});

	});
}

// prevent browser history back
history.pushState(null, document.title, location.href);
window.addEventListener("popstate", () => {
	history.pushState(null, document.title, location.href);
});

//const gotoLandEl = document.getElementById("sl-nav-goto-landscape");
const studioEl = document.getElementById("slang-editor");

if (studioEl) {
	// embed styling
	const styleEl = document.createElement("style")
	styleEl.innerText = styling.toString();
	document.getElementsByTagName("head")[0].appendChild(styleEl)

	slangStudioStandalone(studioEl);
}