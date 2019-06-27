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
	private app!: Slang;
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
		this.app = new Slang(this.appModel);
		const frame = new ViewFrame(this.frame, aspects);
		this.app.addFrame(frame, true);

		this.app.load().then(() => {
			const mainLandscape = this.appModel.getChildNode(LandscapeModel)!;
			mainLandscape.open();
		});
	}
}

customElements.define("slang-studio", SlangStudio);
