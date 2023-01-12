// @ts-ignore
import styling from "@styles/app.scss";

// tslint:disable-next-line
// import {AutoTriggerApp} from "../apps/autotrigger/src/app";
// import {DeploymentApp} from "../apps/deployment/src/app";
// import {OperatorDataApp} from "../apps/operators/app";
// import {BlueprintShareApp} from "../apps/share/src/app";
// import {APIStorageApp} from "../apps/storage/src/app";

// @ts-ignore
import m, {buildPathname, ClassComponent, CVnode} from "mithril";
// @ts-ignore
import { EditBlueprintView } from "./views/edit-blueprint";
import { HomeView } from "./views/home";
import { AppState } from "./state";
import {RunOperatorView} from "./views/run-operator";


class SlangApp {
	constructor() {
		this.subscribe()
		AppState.init()
	}

	public mount(htmlRoot: HTMLElement) {
        AppState.appModel.subscribeReady(async (readyState) => {
			if (!readyState) {
				return
			}

			m.route(htmlRoot, "/", {
				"/": HomeView,
				"/:uuid": {
					render: function({attrs}: CVnode<any>) {
						const blueprint = AppState.getBlueprint(attrs.uuid);

						if (!blueprint) {
							console.error("unknown blueprint uuid:", attrs.uuid)
							return;
						}

						AppState.currentBlueprint = blueprint

						return m(
							blueprint.isRunning
								? RunOperatorView
								: EditBlueprintView,
							attrs
						)
					},
				}
			})
		});
	}

	private subscribe(): void {
		const appModel = AppState.appModel;

        appModel.subscribeReady(async (readyState) => {
            if (!readyState) {
                return;
            }
        })
	}
}


//declare const APIURL: string;
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
