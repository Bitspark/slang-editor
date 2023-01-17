import m, {ClassComponent, CVnode} from "mithril";
import { OperatorBox } from "../../slang/ui/elements/operator";
import {BlueprintModel, OperatorModel} from "../../slang/core/models";
import { Frame } from "../../slang/ui/frame";
import { BlueprintCanvas } from "../../slang/ui/canvas/blueprint";
import { AppState } from "../state";
import { OperatorDashboard } from "./operator-dashboard";
import { ContextMenu } from "./toolkit/context-menu";
import { Box } from "../../slang/ui/toolkit";
import { UserEvent } from "../../slang/ui/canvas/user-events";
import { ConnectionElement } from "../../slang/ui/elements/connection";
import {Label, IconButton} from "../../slang/ui/toolkit/buttons";
import {XY} from "../../slang/definitions/api";
import {BlueprintConfigForm} from "./blueprint-config-form";


class Clipboard {
	private copied: OperatorModel|null = null;

	public constructor() {
	}

	public copy(operator: OperatorModel) {
		this.flush();
		this.copied = operator.copy();
	}

	public paste(blueprint: BlueprintModel, position?: XY) {
		if(!this.copied) {
			return;
		}
		blueprint.copyOperator(this.copied, position);
	}

	public flush() {
		if(this.copied) {
			this.copied.destroy();
		}
	}

	public notEmpty(): boolean {
		return !!this.copied;
	}
}

class Editor {
	private static frame: Frame;
	private static clipboard = new Clipboard();
	private static shownBlueprint?: BlueprintModel = undefined;

    public static init(rootEl: HTMLElement) {
		this.shownBlueprint = undefined
		this.frame = new Frame(rootEl as HTMLElement);
	}

	public static isReadonly(blueprint: BlueprintModel): boolean {
		return !blueprint.isLocal() || blueprint.isRunning;
	}

	public static show(blueprint: BlueprintModel) {
		if (this.shownBlueprint && this.shownBlueprint.uuid === blueprint.uuid) {
			return;
		}
		this.shownBlueprint = blueprint

		const isEditable = !this.isReadonly(blueprint);

		const viewArgs = {
			editable: isEditable,
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};

        const blueprintView = new BlueprintCanvas(this.frame, AppState.aspects, blueprint, viewArgs);

		blueprintView.onUserEvent((e: UserEvent) => {
            ContextMenu.hide();

			if (!e.target) {
				return;
			}

			if (e.target instanceof ConnectionElement) {
				if (e.left.click) {
					e.target.css({
						"sl-is-selected": true,
					});
				}
				return;
			}


			if (e.right.click) {

				if (e.target instanceof OperatorBox) {
					const operator = e.target.getModel();
					const operatorBp = operator.blueprint;
					const view = blueprintView;
					ContextMenu.show(e.target, {
						view: () => m(".sle-comp__context-menu",
							m(".buttons.are-normal", {},

								isEditable
									? m(IconButton, {
										color: "black",
										fas: "copy",
										tooltip: "Copy operator to clipboard",
										onclick() {
											ContextMenu.hide();
											Editor.clipboard.copy(operator);
										}
									},
										m(Label, "copy")
									)
									: undefined,

								isEditable
									? m(IconButton, {
											color: "black",
											fas:"trash-alt",
											tooltip: "Remove operator",
											onclick() {
												ContextMenu.hide();
												blueprint.deleteOperator(operator)
											}
										},
										m(Label, "remove")
									)
									: undefined,

								view.isDescendable && !blueprint.isRunning && !operatorBp.isElementary()
									? m(IconButton, {
										color: "black",
										fas: "project-diagram",
										tooltip: "Open blueprint",
										onclick() {
											ContextMenu.hide();
											m.route.set("/:uuid", {uuid: operatorBp.uuid})
										},
									}, m(Label, "open"))
									: undefined,

							),
							m(OperatorDashboard, {operator, view})
						)
					});
				}
				else {
					ContextMenu.show(e.target, {
						view: () => m(".sle-comp__context-menu", m(BlueprintConfigForm))
					});

					ContextMenu.show2(e, {
						view: () => m(".sle-comp__context-menu",
							m(".buttons.are-normal", {},
								isEditable
									? m(IconButton, {
										color: "black",
										fas: "paste",
										tooltip: "Paste operator from clipboard",
										disabled: !Editor.clipboard.notEmpty(),
										onclick() {
											ContextMenu.hide();
											Editor.clipboard.paste(blueprint, e.xy)
										}
									},
										m(Label, "paste")
									)
									: undefined,
							),
						)
					});
				}
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
	public onbeforeupdate({attrs}: m.Vnode<any, this>) {
		const activeBlueprint = AppState.currentBlueprint;
		Editor.show(activeBlueprint);
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

export class BlueprintEditorRunningOperatorBar implements ClassComponent<any> {
	public view({children}: CVnode<any>) {
		return m(Box, {class: "sle-comp__running-operator-bar"}, children);
	}
}

export class BlueprintEditorBlueprintBar implements ClassComponent<any> {
	public view({children}: CVnode<any>) {
		return m(Box, {class: "sle-comp__blueprint-bar"}, children);
	}
}

export class BlueprintEditorLeftSideBar implements ClassComponent<any> {
	public view({children}: CVnode<any>) {
		return m(Box, {class: "sle-comp__left-side-bar"}, children);
	}
}