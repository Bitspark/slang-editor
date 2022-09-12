// @ts-ignore
import styling from "../styles/app.scss";

// tslint:disable-next-line
// import {AutoTriggerApp} from "../apps/autotrigger/src/app";
// import {DeploymentApp} from "../apps/deployment/src/app";
// import {OperatorDataApp} from "../apps/operators/app";
// import {BlueprintShareApp} from "../apps/share/src/app";
// import {APIStorageApp} from "../apps/storage/src/app";
import { View } from "src/slang/ui/views/view";
import {SlangAspects} from "../slang/aspects";
import {AppModel, LandscapeModel} from "../slang/core/models";
import {SlangBundle} from "../slang/definitions/api";
import {ViewFrame} from "../slang/ui/frame";
import {BlueprintView} from "../slang/ui/views/blueprint";
//import {LandscapeView} from "../slang/ui/views/landscape";
import {PaperViewArgs} from "../slang/ui/views/paper-view";


const bundle: SlangBundle = {
	main: "1f8dc0f2-a7b8-4eb2-8555-3165bba6e843",
	blueprints: {
		"8b62495a-e482-4a3e-8020-0ab8a350ad2d": {
			id: "8b62495a-e482-4a3e-8020-0ab8a350ad2d",
			meta: {
				name: "value",
				icon: "box-full",
				shortDescription: "emitsaconstantvalueforeachitem",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/value",
				tags: [
					"data",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "trigger",
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "generic",
						generic: "valueType",
					},
				},
			},
			delegates: {

			},
			properties: {
				value: {
					type: "generic",
					generic: "valueType",
				},
			},
			connections: {

			},
		},
		"d1191456-3583-4eaf-8ec1-e486c3818c60": {
			id: "d1191456-3583-4eaf-8ec1-e486c3818c60",
			meta: {
				name: "convert",
				icon: "arrow-alt-right",
				shortDescription: "convertsthetypeofavalue",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/convert",
				tags: [
					"data",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "generic",
						generic: "fromType",
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "generic",
						generic: "toType",
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {

			},
		},
		"e49369c2-eac2-4dc7-9a6d-b635ae1654f9": {
			id: "e49369c2-eac2-4dc7-9a6d-b635ae1654f9",
			meta: {
				name: "appendfile",
				icon: "file-plus",
				shortDescription: "appendsbinarydatatoafileorcreatesitifnonexistent",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/append-file",
				tags: [
					"file",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							content: {
								type: "binary",
							},
							filename: {
								type: "string",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "string",
					},
				},
			},
			delegates: {

			},
			properties: {
				newLine: {
					type: "boolean",
				},
			},
			connections: {

			},
		},
		"37ccdc28-67b0-4bb1-8591-4e0e813e3ec1": {
			id: "37ccdc28-67b0-4bb1-8591-4e0e813e3ec1",
			meta: {
				name: "evaluate",
				icon: "function",
				shortDescription: "evaluatesanexpression",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/evaluate",
				tags: [
					"math",
					"boolean",
					"function",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							"{variables}": {
								type: "primitive",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "primitive",
					},
				},
			},
			delegates: {

			},
			properties: {
				expression: {
					type: "string",
				},
				variables: {
					type: "stream",
					stream: {
						type: "string",
					},
				},
			},
			connections: {

			},
		},
		"7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d": {
			id: "7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d",
			meta: {
				name: "add",
				icon: "plus",
				shortDescription: "addstwonumbersAandBandemitstheirsum",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/add",
				tags: [
					"math",
					"arithmetic",
				],
			},
			geometry: {
				size: {
					width: 305,
					height: 164.25,
				},
			},
			operators: {
				Evaluate: {
					operator: "37ccdc28-67b0-4bb1-8591-4e0e813e3ec1",
					geometry: {
						position: {
							x: -5,
							y: 2.5,
						},
					},
					properties: {
						expression: "a+b",
						variables: [
							"a",
							"b",
						],
					},
					generics: {

					},
				},
			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							a: {
								type: "number",
							},
							b: {
								type: "number",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: -5,
						},
					},
					out: {
						type: "number",
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {
				"a(": [
					"a(Evaluate",
				],
				"b(": [
					"b(Evaluate",
				],
				"Evaluate)": [
					")",
				],
			},
		},
		"1f8dc0f2-a7b8-4eb2-8555-3165bba6e843": {
			id: "1f8dc0f2-a7b8-4eb2-8555-3165bba6e843",
			meta: {
				name: "SimpleHTTPPostExample",
			},
			geometry: {
				size: {
					width: 380,
					height: 314,
				},
			},
			operators: {
				add: {
					operator: "7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d",
					geometry: {
						position: {
							x: -60,
							y: -45.5,
						},
					},
					properties: {

					},
					generics: {

					},
				},
				appendfile: {
					operator: "e49369c2-eac2-4dc7-9a6d-b635ae1654f9",
					geometry: {
						position: {
							x: 30,
							y: 74.5,
						},
					},
					properties: {
						newLine: true,
					},
					generics: {

					},
				},
				convert: {
					operator: "d1191456-3583-4eaf-8ec1-e486c3818c60",
					geometry: {
						position: {
							x: 5,
							y: 12.5,
						},
					},
					properties: {

					},
					generics: {
						fromType: {
							type: "number",
						},
						toType: {
							type: "binary",
						},
					},
				},
				value: {
					operator: "8b62495a-e482-4a3e-8020-0ab8a350ad2d",
					geometry: {
						position: {
							x: 100,
							y: -52.5,
						},
					},
					properties: {
						value: "slang-add.txt",
					},
					generics: {
						valueType: {
							type: "string",
						},
					},
				},
			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							gen_a_82: {
								type: "number",
							},
							gen_b_36: {
								type: "number",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "map",
						map: {
							gen__80: {
								type: "number",
							},
						},
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {
				"gen_a_82(": [
					"a(add",
					"(value",
				],
				"gen_b_36(": [
					"b(add",
				],
				"add)": [
					")gen__80",
					"(convert",
				],
				"convert)": [
					"content(appendfile",
				],
				"value)": [
					"filename(appendfile",
				],
			},
		},
	},
};


class Slang {
	private readonly frames: ViewFrame[] = [];
	private outlet: ViewFrame | null = null;
	private defaultViewArgs: PaperViewArgs | null = null;
	private landscape: LandscapeModel;

	constructor(private app: AppModel, private aspects: SlangAspects) {
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
		this.subscribe();
		//return this.app.load();
        return Promise.resolve();
	}

    public displayView(view: View): void {
        if(!this.outlet) {
			throw new Error(`outlet is not attached`);
        }
        this.outlet.setView(view)
    }

	private subscribe(): void {
        this.app.subscribeReady((readyState) => {
            if (!readyState) {
                return;
            }

            const blueprint = this.landscape.loadBundle(bundle)

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
		const app = new Slang(appModel, aspects);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

        /*
		const api = new ApiService(APIURL);
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

		//new APIStorageApp(appModel, aspects, api);
		// new DeploymentApp(appModel, aspects, api);
		// new OperatorDataApp(appModel, aspects);
		// new AutoTriggerApp(appModel, aspects);
		// new BlueprintShareApp(appModel, aspects);

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