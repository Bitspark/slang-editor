// tslint:disable-next-line:no-unused
import {BlueprintModel, LandscapeModel} from "#slang/core/models";
import {SlangBundle} from "#slang/definitions/api";
import {BlueprintView} from "#slang/ui/views/blueprint";
// @ts-ignore
import SlangEditorStyling from "#styles/index.scss";
import {css, CSSResult, customElement, html, LitElement, TemplateResult} from "lit-element";

import {SlangAspects} from "../aspects";
import {AppModel} from "../core/models/app";
import {ViewFrame} from "../ui/frame";

@customElement("slang-editor")
export class SlangEditor extends LitElement {
	private blueprint?: BlueprintModel;
	private viewFrame?: ViewFrame;
	private readonly landscape: LandscapeModel;

	constructor() {
		super();
		this.landscape = AppModel.create("slang").createLandscape();
	}

	public static get styles(): CSSResult {
		return css``;
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

	public render(): TemplateResult {
		return html`<div></div><style>${SlangEditorStyling.toString()}</style>`;
	}

	public firstUpdated(_changedProperties: Map<PropertyKey, unknown>): void {
		if (!this.shadowRoot) {
			return;
		}
		const frame = this.shadowRoot.firstElementChild as HTMLElement;
		this.viewFrame = new ViewFrame(frame, new SlangAspects());

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
		this.viewFrame.setView(new BlueprintView(this.viewFrame, blueprint, viewArgs));
	}
}
