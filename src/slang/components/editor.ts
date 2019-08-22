// tslint:disable-next-line:no-unused
import {customElement, html, LitElement, TemplateResult} from "lit-element";

import {SlangAspects} from "../aspects";
import {AppModel} from "../core/models/app";
import {Slang} from "../slang";
import {ViewFrame} from "../ui/frame";

@customElement("slang-editor")
export class SlangEditor extends LitElement {
	public readonly app: Slang;
	public readonly appModel: AppModel;

	constructor() {
		super();
		this.appModel = AppModel.create("slang");
		this.app = new Slang(this.appModel);
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
