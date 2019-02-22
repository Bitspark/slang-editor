import {BlueprintModel} from "./core/models/blueprint";
import {PaperView} from "./ui/views/paper-view";

export interface BlueprintToolBoxType {
	label: string;
	icon?: string;
	class?: string;
	onclick?: () => void;
}

export class SlangAspects {
	private aspectBlueprintToolbox = new Array<(view: PaperView, blupr: BlueprintModel) => BlueprintToolBoxType[]>();

	public getBlueprintToolboxButtons(view: PaperView, blueprint: BlueprintModel): BlueprintToolBoxType[] {
		return this.aspectBlueprintToolbox.reduce((accumBtnAttrs: BlueprintToolBoxType[], cBtnAttrs) => accumBtnAttrs.concat(cBtnAttrs(view, blueprint)), []);
	}

	public registerBlueprintToolboxButton(f: (view: PaperView, blupr: BlueprintModel) => BlueprintToolBoxType[]) {
		this.aspectBlueprintToolbox.push(f);
	}

}

export const SLANG_ASPECTS = new SlangAspects();
