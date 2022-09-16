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
import { BlueprintEditorView } from "./views/blueprint-editor";
import { AppState } from "./state";


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
	constructor() {
		this.subscribe()
		AppState.init()
	}

	public mount(htmlRoot: HTMLElement) {
        AppState.appModel.subscribeReady(async (readyState) => {
			if (!readyState) {
				return
			}

			const blueprint = AppState.createEmptyBlueprint()
			AppState.currentBlueprint = blueprint;

			m.mount(htmlRoot, {
				view() {
					return m(BlueprintEditorView)
				}
			});
		});

		/*
		m.mount(htmlRoot, {
			oncreate: () => {
			},
			onupdate: () => {
			},
			view: () => {
				const localBlueprints = Array.from(this.blueprints.values()).filter(bp => bp.isLocal());
				return m("section.section",
					m(".container",
						m(".panel",
							m(".panel-heading", `Blueprints (${localBlueprints.length})`),
							m("a.panel-block", {onclick:() => this.createNewBlueprint().open()}, [m("span.panel-icon", m("i.fas.fa-plus")), "New Blueprint"]),
							localBlueprints.map(bp => m("a.panel-block",
							{onclick: () => bp.open()},
							[m("span.panel-icon", m("i.fas.fa-circle")), bp.getShortName()])
							)
						)
					)
				);
			},
		});
		*/
	}

	private subscribe(): void {
        AppState.appModel.subscribeReady(async (readyState) => {
            if (!readyState) {
                return;
            }
			m.redraw()
        })

		/*
		this.appModel.subscribeOpenedBlueprintChanged((blueprint) => {
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

            const blueprintView = new BlueprintView(this.outlet!, this.aspects, blueprint, viewArgs);
			this.displayView(blueprintView)
		});
		*/

		/*
		this.appModel.subscribeOpenedLandscapeChanged((landscape) => {
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
