import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { BlueprintMenu } from "../components/blueprint-menu";
import { AppState } from "../state";

export class EditBlueprintView implements ClassComponent<any> {
	// @ts-ignore
    blueprint: BlueprintModel|null;

	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
        this.blueprint = AppState.getBlueprint(attrs.uuid)
	}

    public oncreate(vnode: m.VnodeDOM<any, this>) {
        const blueprint = this.blueprint;
        if (!blueprint) {
            console.error("EditBlueprintView requires an existing Blueprint.");
            return;
        }

        const el = vnode.dom.getElementsByTagName("main")[0];
		const frame = new ViewFrame(el);

		const viewArgs = {
			editable: blueprint.isLocal(),
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};

        const blueprintView = new BlueprintView(frame, AppState.aspects, blueprint, viewArgs);
        frame.setView(blueprintView);
    }

	public view({attrs}: CVnode<any>) {
        const blueprint = this.blueprint!;

		return m(".columns.sle-comp__blueprint-editor", attrs, [
                m(BlueprintMenu, {
                    class: "column is-2",
                    exclude: (bp: BlueprintModel) => blueprint.uuid === bp.uuid,
                    onselect(bp: BlueprintModel) {
                        blueprint.createBlankOperator(bp, {position: {x: 0, y: 0}})
                    }
                }),
                m("main#slang-editor", {
                    class: "column"
                }),
            ]);
	}
}