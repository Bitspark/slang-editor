import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import {
	BlueprintEditor,
	BlueprintEditorBlueprintBar,
	BlueprintEditorRunningOperatorBar
} from "../components/blueprint-editor";
import {AppState} from "../state";
import {StartingOperatorDetails} from "../components/starting-operator-details";
import {RunningOperatorDetails} from "../components/running-operator-details";

export class RunOperatorView implements ClassComponent<any> {
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
		const blueprint = AppState.getBlueprint(attrs.uuid)!;

		return m(".sle-view__edit-blueprint", attrs,
			m(BlueprintEditor,
				m(BlueprintEditorBlueprintBar, m(BlueprintControlBar)),
				// @ts-ignore
				m(BlueprintEditorRunningOperatorBar, m(blueprint.isStarting ? StartingOperatorDetails : RunningOperatorDetails)),
			)
		);
	}
}
