import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import {
	BlueprintEditor,
	BlueprintEditorLeftSideBar,
	BlueprintEditorBlueprintBar,
} from "../components/blueprint-editor";
import { BlueprintMenu } from "../components/blueprint-menu";
import {BlueprintModel} from "../../slang/core/models";
import {AppState} from "../state";

export class EditBlueprintView implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
	}

	// @ts-ignore
    public oncreate(vnode: m.VnodeDOM<any>) {
    }

	// @ts-ignore
	public onupdate({attrs}: m.Vnode<any>) {
	}

	public view({attrs}: CVnode<any>) {
		const blueprint = AppState.currentBlueprint!;
		return m(".sle-view__edit-blueprint", attrs,
			m(BlueprintEditor,
				m(BlueprintEditorBlueprintBar, m(BlueprintControlBar)),
				m(BlueprintEditorLeftSideBar, m(BlueprintMenu, {
					exclude: (bp: BlueprintModel) => blueprint.uuid === bp.uuid,
					onselect(bp: BlueprintModel) {
						blueprint.createBlankOperator(bp, {position: {x: 0, y: 0}})
					}
				})),
			)
		);
	}
}