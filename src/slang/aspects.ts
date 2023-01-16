import {BlueprintModel} from "./core/models";
import {ComponentFactory} from "./ui/factory";
import {Canvas} from "./ui/canvas/base";

export interface BlueprintToolBoxType {
	label: string;
	icon?: string
	class?: string;

	onclick?(): void;
}

export class SlangAspects {
	public readonly factory = new ComponentFactory();

	private aspectBlueprintToolbox = new Array<(view: Canvas, blupr: BlueprintModel, redraw: () => void) => BlueprintToolBoxType[]>();

	public getBlueprintToolboxButtons(view: Canvas, blueprint: BlueprintModel, redraw: () => void): BlueprintToolBoxType[] {
		return this.aspectBlueprintToolbox.reduce((accumBtnAttrs: BlueprintToolBoxType[], cBtnAttrs) => accumBtnAttrs.concat(cBtnAttrs(view, blueprint, redraw)), []);
	}

	public registerBlueprintToolboxButton(f: (view: Canvas, blupr: BlueprintModel, redraw: () => void) => BlueprintToolBoxType[]) {
		this.aspectBlueprintToolbox.push(f);
	}
}
