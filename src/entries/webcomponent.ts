import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/app";
import {BlueprintShareApp} from "../apps/share/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {SlangAspects} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";

class SlangStudio extends HTMLElement {
	private frame: HTMLDivElement;
	private apiurl: string | null;

	constructor() {
		super();

		const shadow = this.attachShadow({mode: "open"});

		this.apiurl = this.getAttribute("apiurl");
		this.frame = document.createElement("div");
		this.setup();

		shadow.appendChild(this.frame);
	}

	private setup() {
		if (!this.apiurl) {
			throw new Error("need apiurl as attribute");
		}

		const appModel = AppModel.create("slang");
		const aspects = new SlangAspects();
		const app = new Slang(appModel);
		const frame = new ViewFrame(this.frame, aspects);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, aspects, this.apiurl);
		new DeploymentApp(appModel, aspects, this.apiurl);
		new OperatorDataApp(appModel, aspects);
		new AutoTriggerApp(appModel, aspects);
		new BlueprintShareApp(appModel, aspects);

		app.load().then(() => {
			const mainLandscape = appModel.getChildNode(LandscapeModel)!;
			mainLandscape.open();
		});
	}
}

customElements.define("slang-studio", SlangStudio);
