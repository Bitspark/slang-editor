import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import {
	BlueprintEditor,
	BlueprintEditorBlueprintBar,
	BlueprintEditorRunningOperatorBar
} from "../components/blueprint-editor";
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
		return m(".sle-view__edit-blueprint", attrs,
			m(BlueprintEditor,
				m(BlueprintEditorBlueprintBar, m(BlueprintControlBar)),
				m(BlueprintEditorRunningOperatorBar, m(RunningOperatorDetails)),
			)
		);
	}
}
