import m, {ClassComponent, CVnode} from "mithril";
import { OperatorBoxComponent } from "../../slang/ui/components/blackbox";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import { BlueprintMenu } from "../components/blueprint-menu";
import { AppState } from "../state";
import { OperatorDashboard } from "../components/operator-dashboard";
import { OperatorControl } from "../components/operator-control";
import { ContextMenu } from "../components/operator-context-menu";
import { Box } from "../../slang/ui/toolkit";
import { UserEvent } from "../../slang/ui/views/user-events";
import { ConnectionComponent } from "../../slang/ui/components/connection";

class Editor {
	private static frame: ViewFrame;
    public static blueprintView: BlueprintView;

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
								operator.destroy();
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
								m.route.set("/edit/:uuid", {uuid: operatorBp.uuid})
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

export class EditBlueprintView implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
        AppState.activeBlueprint = AppState.getBlueprint(attrs.uuid);
	}

	// @ts-ignore
	public onbeforeupdate({attrs}: m.Vnode<any, this>) {
		const activeBlueprint = AppState.activeBlueprint;
		if (!activeBlueprint) {
			console.error("EditBlueprintView requires an existing Blueprint.");
			return;
		}

		if (activeBlueprint.uuid !== attrs.uuid) {
			// BlueprintView will be updated to show requested Blueprint.
			// requested Blueprint will become newly active Blueprint.
			const requestedBlueprint = AppState.getBlueprint(attrs.uuid)

			if (!requestedBlueprint) {
				console.error("EditBlueprintView requires an existing Blueprint.");
				return;
			}
			AppState.activeBlueprint = requestedBlueprint
			Editor.show(requestedBlueprint);
		}
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
        const blueprint = AppState.activeBlueprint!;

		return m(".sle-view__edit-blupr", attrs,
			m(".slang-editor"),
			m(Box, {class: "sle-view__edit-blupr__top-left"}, m(BlueprintControlBar)),
			m(Box, {class: "sle-view__edit-blupr__left-sidebar"}, m(BlueprintMenu, {
				exclude: (bp: BlueprintModel) => blueprint.uuid === bp.uuid,
				onselect(bp: BlueprintModel) {
					blueprint.createBlankOperator(bp, {position: {x: 0, y: 0}})
				}
			}))
		);
	}
}