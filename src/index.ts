import {SlangAspects} from "./slang/aspects";
import {AppModel} from "./slang/core/models/app";
import {Slang} from "./slang/slang";
import {ViewFrame} from "./slang/ui/frame";
import {INDEX} from "./styles";

export * from "./slang/definitions/api";
export * from "./slang/definitions/type";
export * from "./slang/core/mapper";
export * from "./slang/core/models/app";
export * from "./slang/core/models/blueprint";
export * from "./slang/core/models/delegate";
export * from "./slang/core/models/landscape";
export * from "./slang/core/models/operator";
export * from "./slang/core/models/port";

export class SlangStudioElement extends HTMLElement {
	public readonly app: Slang;
	public readonly appModel: AppModel;

	private readonly frame: HTMLDivElement;

	constructor() {
		super();

		const shadow = this.attachShadow({mode: "open"});

		this.frame = document.createElement("div");
		const style = document.createElement("style");
		style.innerText = INDEX;
		shadow.appendChild(style);
		shadow.appendChild(this.frame);

		this.appModel = AppModel.create("slang");

		this.app = new Slang(this.appModel);
		this.app.addFrame(new ViewFrame(this.frame, new SlangAspects()), true);
		this.app.load();
	}

	public get model(): AppModel {
		return this.appModel;
	}
}

customElements.define("slang-studio", SlangStudioElement);
