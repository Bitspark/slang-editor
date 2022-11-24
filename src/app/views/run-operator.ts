import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import { AppState } from "../state";
import { Box } from "../../slang/ui/toolkit";

class Editor {
	private static frame: ViewFrame;

    public static init(rootEl: HTMLElement) {
		this.frame = new ViewFrame(rootEl as HTMLElement);
	}

	public static show(blueprint: BlueprintModel) {
		const viewArgs = {
			editable: false,
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};
        const blueprintView = new BlueprintView(this.frame, AppState.aspects, blueprint, viewArgs);
        this.frame.setView(blueprintView);
	}
}

export class RunOperatorView implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
        AppState.activeBlueprint = AppState.getBlueprint(attrs.uuid);
	}

    public oncreate(vnode: m.VnodeDOM<any>) {
        const blueprint = AppState.activeBlueprint;
        if (!blueprint) {
            console.error("EditBlueprintView requires an existing Blueprint.");
            return;
        }

        const el = vnode.dom.getElementsByClassName("slang-editor")[0];
		Editor.init(el as HTMLElement);
		Editor.show(blueprint);
    }

	// @ts-ignore
	public onupdate({attrs}: m.Vnode<any>) {
	}

	public view({attrs}: CVnode<any>) {
        //const blueprint = AppState.activeBlueprint!;

		return m(".sle-view__run-opr", attrs,
				m(".sle-view__layout",
					m(".sle-view__layout--half-screen",
						m(".sle-view__edit-blupr",
							m(".slang-editor"),
							m(Box, {class: "sle-view__edit-blupr__top-left"}, m(BlueprintControlBar)),
						)
					),
					m(".sle-view__layout--half-screen",
						m(".sle-view__run-opr__view-run-opr",
							m("h1", "hey")
						)
					)
				)
		);
	}
}