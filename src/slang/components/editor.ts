import {STYLING} from "../../styles";
import {SlangAspects} from "../aspects";
import {SlangBehaviorSubject} from "../core/abstract/utils/events";
import {AppModel, BlueprintModel, LandscapeModel} from "../core/models";
import {SlangBundle} from "../definitions/api";
import {ViewFrame} from "../ui/frame";
import {BlueprintView, SelectableComponent} from "../ui/views/blueprint";

const template = document.createElement("template");
template.innerHTML = `
<div class="ViewFrame"></div>
<style>
:host {
	display: block;
}
${STYLING}
</style>
`;

export class SlangEditor extends HTMLElement {
	public blueprintView?: BlueprintView;
	public readonly selected = new SlangBehaviorSubject<SelectableComponent | null>("element-selected", null);

	private blueprint?: BlueprintModel;
	private viewFrame?: ViewFrame;
	private readonly landscape: LandscapeModel;

	constructor() {
		super();
		this.landscape = AppModel.create("slang").createLandscape();
		this.attachShadow({mode: "open"}).appendChild(template.content.cloneNode(true));
	}

	public connectedCallback() {
		this.firstUpdated();
	}

	public loadBundle(bundle: SlangBundle): BlueprintModel {
		return this.landscape.loadBundle(bundle);
	}

	public exportBundle(): SlangBundle | null {
		if (this.blueprint) {
			return this.landscape.exportBundle(this.blueprint.uuid);
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
		this.blueprintView = new BlueprintView(this.viewFrame, new SlangAspects(), blueprint, viewArgs);

		const that = this;
		this.blueprintView.selected.subscribe((e: SelectableComponent | null) => {
			that.selected.next(e);
		});
		this.viewFrame.setView(this.blueprintView);
	}
}
