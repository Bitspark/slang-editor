// tslint:disable-next-line
import "./styles/index.scss";

// tslint:disable-next-line
import {SlangAspects} from "./slang/aspects";
import {AppModel} from "./slang/core/models/app";
import {LandscapeModel} from "./slang/core/models/landscape";
import {Slang} from "./slang/slang";
import {ViewFrame} from "./slang/ui/frame";

class SlangStudio extends HTMLElement {
	private readonly frame: HTMLDivElement;
	private appModel!: AppModel;

	constructor() {
		super();

		const shadow = this.attachShadow({mode: "open"});

		this.frame = document.createElement("div");
		this.setup();

		shadow.appendChild(this.frame);
	}

	public get model(): AppModel {
		return this.appModel;
	}

	private setup() {
		this.appModel = AppModel.create("slang");

		const aspects = new SlangAspects();
		const app = new Slang(this.appModel);
		const frame = new ViewFrame(this.frame, aspects);
		app.addFrame(frame, true);

		app.load().then(() => {
			const mainLandscape = this.appModel.getChildNode(LandscapeModel)!;
			mainLandscape.open();
		});
	}
}

export function init() {
	customElements.define("slang-studio", SlangStudio);
}
