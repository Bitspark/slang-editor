import {OperatorDataExt} from "../../extensions/operators";
import {STYLING} from "../../styles";
import {SlangAspects} from "../aspects";
import {AppModel, BlueprintModel, LandscapeModel} from "../core/models";
import {SlangFileJson} from "../definitions/api";
import {ViewFrame} from "../ui/frame";
import {BlueprintView} from "../ui/views/blueprint";

const template = document.createElement("template");
template.innerHTML = `
<div class="ViewFrame"></div>
<style>
:host {
	display: block;
}
.ViewFrame {
	height: 100%;
}
${STYLING}
</style>
`;

export class SlangEditor extends HTMLElement {
	public blueprintView?: BlueprintView;

	private blueprint?: BlueprintModel;
	private viewFrame?: ViewFrame;
	private readonly landscape: LandscapeModel;
	private readonly aspects: SlangAspects;

	constructor() {
		super();
		const appModel = AppModel.create("slang");
		this.landscape = appModel.createLandscape();
		this.aspects = new SlangAspects();

		OperatorDataExt.register(appModel, this.aspects);

		this.attachShadow({mode: "open"}).appendChild(template.content.cloneNode(true));
	}

	public connectedCallback() {
		this.firstUpdated();
	}

	public import(slangFile: SlangFileJson): BlueprintModel {
		return this.landscape.import(slangFile);
	}

	public export(): SlangFileJson | null {
		if (this.blueprint) {
			return this.landscape.export(this.blueprint.uuid);
		}
		return null;
	}

	public findBlueprint(id: string): BlueprintModel | undefined {
		return this.landscape.findBlueprint(id);
	}

	public firstUpdated(): void {
		if (!this.shadowRoot) {
			return;
		}
		const frame = this.shadowRoot.firstElementChild as HTMLElement;
		this.viewFrame = new ViewFrame(frame);

		if (this.blueprint) {
			this.displayBlueprint(this.blueprint);
		}
	}

	public displayBlueprint(blueprint: BlueprintModel) {
		this.blueprint = blueprint;

		if (!this.viewFrame) {
			return;
		}

		const viewArgs = {
			editable: blueprint.isLocal(),
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};
		this.blueprintView = new BlueprintView(this.viewFrame, this.aspects, blueprint, viewArgs);
		this.viewFrame.setView(this.blueprintView);
	}
}
