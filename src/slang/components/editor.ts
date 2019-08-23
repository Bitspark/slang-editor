// tslint:disable-next-line:no-unused
import {BlueprintModel, LandscapeModel} from "#slang/core/models";
import {SlangBundle} from "#slang/definitions/api";
import {customElement, html, LitElement, TemplateResult} from "lit-element";

import {SlangAspects} from "../aspects";
import {AppModel} from "../core/models/app";
import {Slang} from "../slang";
import {ViewFrame} from "../ui/frame";

@customElement("slang-editor")
export class SlangEditor extends LitElement {
	private blueprint?: BlueprintModel;
	private readonly app: Slang;
	private readonly appModel: AppModel;
	private readonly landscape: LandscapeModel;

	constructor() {
		super();
		this.appModel = AppModel.create("slang");
		this.app = new Slang(this.appModel);
		this.landscape = this.appModel.createLandscape();
	}
	public loadBundle(bundle: SlangBundle): BlueprintModel {
		this.blueprint = this.landscape.loadBundle(bundle);
		return this.blueprint;
	}

	public exportBundle(): SlangBundle|null {
		if (this.blueprint) {
			return this.landscape.exportBundle(this.blueprint.uuid);
		}
		return null;
	}

	public render(): TemplateResult {
		return html`<div></div>`;
	}

	public firstUpdated(_changedProperties: Map<PropertyKey, unknown>): void {
		if (!this.shadowRoot) {
			return;
		}

		const frame = this.shadowRoot.firstElementChild as HTMLElement;
		this.app.addFrame(new ViewFrame(frame, new SlangAspects()), true);
		this.app.load();
	}
}
