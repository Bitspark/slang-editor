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

	private aspectBlueprintToolbox = new Array<(view: PaperView, blupr: BlueprintModel) => BlueprintToolBoxType[]>();

	public getBlueprintToolboxButtons(view: PaperView, blueprint: BlueprintModel): BlueprintToolBoxType[] {
		return this.aspectBlueprintToolbox.reduce((accumBtnAttrs: BlueprintToolBoxType[], cBtnAttrs) => accumBtnAttrs.concat(cBtnAttrs(view, blueprint)), []);
	}

	public registerBlueprintToolboxButton(f: (view: PaperView, blupr: BlueprintModel) => BlueprintToolBoxType[]) {
		this.aspectBlueprintToolbox.push(f);
	}
}
