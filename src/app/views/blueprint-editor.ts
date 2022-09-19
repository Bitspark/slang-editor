import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { BlueprintMenu } from "../components/blueprint-menu";
import { AppState } from "../state";

export class BlueprintEditorView implements ClassComponent<any> {

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
	}

    public oncreate(vnode: m.VnodeDOM<any, this>) {
        if (!AppState.currentBlueprint) {
            console.error("BlueprintEditorView requieres a defined AppState.currentBlueprint.");
            return;
        }

        const el = vnode.dom.getElementsByTagName("main")[0];
		const frame = new ViewFrame(el);
        const blueprint = AppState.currentBlueprint;

		const viewArgs = {
			editable: blueprint.isLocal(),
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};

        const blueprintView = new BlueprintView(frame, AppState.aspects, AppState.currentBlueprint, viewArgs);
        frame.setView(blueprintView);
    }

	public view({attrs}: CVnode<any>) {
		return m(".columns.sle-comp__blueprint-editor", attrs, [
                m(BlueprintMenu, {
                    class: "column is-2",
                    onselect(blueprint: BlueprintModel) {
                        AppState.addOperator(blueprint)                        
                    }
                }),
                m("main#slang-editor", {
                    class: "column"
                }),
            ]);
	}
}