// @ts-ignore
import styling from "@styles/app.scss";

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
// @ts-ignore
import {BlueprintView} from "../slang/ui/views/blueprint";
//import {LandscapeView} from "../slang/ui/views/landscape";
import {PaperViewArgs} from "../slang/ui/views/paper-view";
import { ApiService } from "./services";
import { blueprintModelToJson, loadBlueprints } from "../slang/core/mapper";
import { OperatorDataExt } from "../extensions/operators";

// @ts-ignore
import m, {ClassComponent, CVnode} from "mithril";
// @ts-ignore
import { SlangBehaviorSubject } from "@slang";

/*
class SlangApp implements ClassComponent<any> {

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
		
	}

	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}

m.mount(document.body, SlangApp)
*/

class SlangApp {
	private landscape: LandscapeModel;
	private appModel: AppModel;
	private api: ApiService;
	private aspects: SlangAspects;
	private extensions = [
		OperatorDataExt,
	]

	private blueprints = new Map<string, BlueprintModel>();

	private readonly frames: ViewFrame[] = [];
	private outlet: ViewFrame | null = null;
	private defaultViewArgs: PaperViewArgs | null = null;

	constructor() {
		this.appModel = AppModel.create("slang");
		this.aspects = new SlangAspects();
		this.api = new ApiService(APIURL);
		this.landscape = this.appModel.createLandscape();

		this.registerExtensions()
		this.subscribe()

		// Emits ready signal
		this.appModel.load()
	}

	private registerExtensions() {
		this.extensions.forEach(extClass => extClass.register(this.appModel, this.aspects))
	}

	private async loadBlueprints(): Promise<void> {
		loadBlueprints(this.landscape, await this.api.getBlueprints());
        return Promise.resolve();
	}

	public storeBlueprint(blueprint: BlueprintModel): void {
		this.api.storeBlueprint(blueprintModelToJson(blueprint)).then(() => {
			return;
		});
	}

	public mount(htmlRoot: HTMLElement) {
		m.mount(htmlRoot, {
			oncreate: () => {
			},
			onupdate: () => {
			},
			view: () => {
				const localBlueprints = Array.from(this.blueprints.values())//.filter(bp => bp.isLocal());
				return m(".panel",
				m(".panel-heading", `Blueprints (${localBlueprints.length})`),
				localBlueprints.map(bp => m(".panel-block", {onclick: () => bp.open()}, bp.getShortName())));
			},
		});
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

    public displayView(view: View): void {
        if(!this.outlet) {
			throw new Error(`outlet is not attached`);
        }
        this.outlet.setView(view)
    }

	private subscribe(): void {

		this.appModel.subscribeLoadRequested(() => {
			return this.loadBlueprints()
		});

		this.appModel.subscribeStoreRequested((blueprint: BlueprintModel) => {
			this.storeBlueprint(blueprint);
		});

		this.landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			this.blueprints.set(blueprint.uuid, blueprint)
		});

        this.appModel.subscribeReady(async (readyState) => {
            if (!readyState) {
                return;
            }
			const blueprint = this.landscape.findBlueprint("a39a873e-dfb9-4ac9-ab12-24cb1051a4bb")!

			///// make use of auto-draw of m.mount
			m.redraw()

			if (!blueprint) {
				return;
			}

			// @ts-ignore
			const viewArgs = this.defaultViewArgs || {
				editable: blueprint.isLocal(),
				hscrollable: true,
				vscrollable: true,
				descendable: true,
				runnable: true,
			};


            //const blueprintView = new BlueprintView(this.outlet!, this.aspects, blueprint, viewArgs);
            //this.displayView(blueprintView);
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
const app = new SlangApp();
app.mount(document.body);

const styleEl = document.createElement("style")
styleEl.innerText = styling.toString();
document.getElementsByTagName("head")[0].appendChild(styleEl)

/*
function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const aspects = new SlangAspects();
		const api = new ApiService(APIURL);
		const app = new Slang(appModel, aspects, api);
		//const frame = new ViewFrame(el);

		const mainLandscape = appModel.getChildNode(LandscapeModel)!;

		//app.addFrame(frame, true);

		app.load().then(() => {
			const localBlueprints: BlueprintModel[] = []
			mainLandscape.subscribeChildCreated(BlueprintModel, (blueprint: BlueprintModel) => {

				blueprint.subscribeOpenedChanged((opened) => {
					if(opened) { 
						console.log("Open Blueprint", blueprint)
					}
				})

				localBlueprints.push(blueprint)
			});

			m.mount(el, {
				oncreate: () => {
				},
				onupdate: () => {
				},
				view: () => {
					return m(".panel",
					m(".panel-heading", "Blueprints"),
					localBlueprints.map(bp => m(".panel-block", {onclick: () => bp.open()}, bp.getShortName())));
				},
			});

			resolve();
		});

	});
}
/*

// prevent browser history back
history.pushState(null, document.title, location.href);
window.addEventListener("popstate", () => {
	history.pushState(null, document.title, location.href);
});

//const gotoLandEl = document.getElementById("sl-nav-goto-landscape");
const appEl = document.getElementById("slang-app");
* /
const appEl = null
if (appEl) {
	// embed styling
	const styleEl = document.createElement("style")
	styleEl.innerText = styling.toString();
	document.getElementsByTagName("head")[0].appendChild(styleEl)

	slangStudioStandalone(appEl);
}
*/
