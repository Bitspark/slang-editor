import {BlueprintModel} from "./core/models/blueprint";
import {ComponentFactory} from "./ui/factory";
import {PaperView} from "./ui/views/paper-view";

export interface BlueprintToolBoxType {
	label: string;
	icon?: string;
	class?: string;

	onclick?(): void;
}

export class SlangAspects {
	public readonly factory = new ComponentFactory();

	private aspectBlueprintToolbox = new Array<(view: PaperView, blupr: BlueprintModel, redraw: () => void) => BlueprintToolBoxType[]>();

	public getBlueprintToolboxButtons(view: PaperView, blueprint: BlueprintModel, redraw: () => void): BlueprintToolBoxType[] {
		return this.aspectBlueprintToolbox.reduce((accumBtnAttrs: BlueprintToolBoxType[], cBtnAttrs) => accumBtnAttrs.concat(cBtnAttrs(view, blueprint, redraw)), []);
	}

	public registerBlueprintToolboxButton(f: (view: PaperView, blupr: BlueprintModel, redraw: () => void) => BlueprintToolBoxType[]) {
		this.aspectBlueprintToolbox.push(f);
	}
}
