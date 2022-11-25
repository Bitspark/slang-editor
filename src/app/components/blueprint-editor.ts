import m, {ClassComponent, CVnode} from "mithril";
import { OperatorBoxComponent } from "../../slang/ui/components/blackbox";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { AppState } from "../state";
import { OperatorDashboard } from "./operator-dashboard";
import { OperatorControl } from "./operator-control";
import { ContextMenu } from "./toolkit/context-menu";
import { Box } from "../../slang/ui/toolkit";
import { UserEvent } from "../../slang/ui/views/user-events";
import { ConnectionComponent } from "../../slang/ui/components/connection";

class Editor {
	private static frame: ViewFrame;

    public static init(rootEl: HTMLElement) {
		this.frame = new ViewFrame(rootEl as HTMLElement);
	}

	public static show(blueprint: BlueprintModel) {
		const viewArgs = {
			editable: blueprint.isLocal(),
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};

        const blueprintView = new BlueprintView(this.frame, AppState.aspects, blueprint, viewArgs);

		blueprintView.onUserEvent((e: UserEvent) => {
            ContextMenu.hide();

			if (e.target instanceof ConnectionComponent) {
				if (e.left.click) {
					e.target.css({
						"sl-is-selected": true,
					});
				}
			}

			if (e.right.click && e.target instanceof OperatorBoxComponent) {
				const operator = e.target.getModel();
				const operatorBp = operator.blueprint;
				const view = blueprintView;
				ContextMenu.show(e.target, {
					view: () => m(".sle-comp__opr-context-menu",
						m(OperatorControl, {
							ondelete: view.isEditable
							? () => {
								ContextMenu.hide();
								blueprint.deleteOperator(operator)
							}
							: undefined,

							onclone: view.isEditable
							? () => {
								ContextMenu.hide();
								blueprint.cloneOperator(operator);
							}
							: undefined,

							onopen: view.isDescendable && !operatorBp.isElementary()
							? () => {
								ContextMenu.hide();
								m.route.set("/:uuid", {uuid: operatorBp.uuid})
							}
							: undefined,
						}),
						operatorBp.hasProperties() || operatorBp.hasGenerics() 
						? m(OperatorDashboard, {operator, view})
						: undefined
					)
				});
			}
		});
        this.frame.setView(blueprintView);
	}
}

export class BlueprintEditor implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
	}

    public oncreate(vnode: m.VnodeDOM<any>) {
        const blueprint = AppState.currentBlueprint;
        const el = vnode.dom.getElementsByClassName("blueprint-canvas")[0];
		Editor.init(el as HTMLElement);
		Editor.show(blueprint);
    }

	// @ts-ignore
	public onupdate({attrs}: m.Vnode<any>) {
	}

	public view({attrs, children}: CVnode<any>) {
		return m(".sle-comp__blueprint-editor",
			attrs,
			m(".blueprint-canvas"),
			children
		);
	}
}

export class BlueprintEditorTopBar implements ClassComponent<any> {
	public view({children}: CVnode<any>) {
		return m(Box, {class: "sle-comp__blueprint-editor__topbar"}, children);
	}
}

export class BlueprintEditorSideBar implements ClassComponent<any> {
	public view({children}: CVnode<any>) {
		return m(Box, {class: "sle-comp__blueprint-editor__left-sidebar"}, children);
	}
}