import {css, CSSResult, html, LitElement, TemplateResult} from "lit-element";

// @ts-ignore
import SlangEditorStyling from "../../styles/index.scss";
import {SlangAspects} from "../aspects";
import {AppModel, BlueprintModel, LandscapeModel} from "../core/models";
import {SlangBundle} from "../definitions/api";
import {ViewFrame} from "../ui/frame";
import {BlueprintView} from "../ui/views/blueprint";

export class SlangEditor extends LitElement {
	private blueprint?: BlueprintModel;
	private viewFrame?: ViewFrame;
	private readonly landscape: LandscapeModel;

	constructor() {
		super();
		this.landscape = AppModel.create("slang").createLandscape();
	}

	public static get styles(): CSSResult {
		return css`:host {
			display:block
		}`;
	}
	public loadBundle(bundle: SlangBundle): BlueprintModel {
		const blueprint = this.landscape.loadBundle(bundle);

		if (blueprint !== this.blueprint) {
			this.showBlueprint(blueprint);
		}

		return this.blueprint = blueprint;
	}

	public exportBundle(): SlangBundle|null {
		if (this.blueprint) {
			return this.landscape.exportBundle(this.blueprint.uuid);
		}
		return null;
	}

	public findBlueprint(id: string): BlueprintModel | undefined {
		return this.landscape.findBlueprint(id);
	}

	public render(): TemplateResult {
		return html`<div class="ViewFrame"></div><style>${SlangEditorStyling.toString()}</style>`;
	}

	public firstUpdated(_changedProperties: Map<PropertyKey, unknown>): void {
		if (!this.shadowRoot) {
			return;
		}
		const frame = this.shadowRoot.firstElementChild as HTMLElement;
		this.viewFrame = new ViewFrame(frame);

		if (this.blueprint) {
			this.showBlueprint(this.blueprint);
		}
	}

	private showBlueprint(blueprint: BlueprintModel) {
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
		this.viewFrame.setView(new BlueprintView(this.viewFrame, new SlangAspects(), blueprint, viewArgs));
	}
}

customElements.define("slang-editor", SlangEditor);
