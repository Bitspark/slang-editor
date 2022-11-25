import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView } from "../../slang/ui/views/blueprint";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import { AppState } from "../state";
import { Box, Block } from "../../slang/ui/toolkit";
import {Input} from "../components/console";
import {SlangType, SlangTypeValue} from "../../slang/definitions/type";
import {List, ListEntry} from "../components/toolkit/list";
import {Button} from "../../slang/ui/toolkit/buttons";

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

class RunningOperator {
	public static log: {sent: SlangTypeValue, received: SlangTypeValue}[] = [];

	private static blueprint: BlueprintModel;

	public static get inType(): SlangType {
		return this.blueprint.getPortIn()!.getType();
	}

	public static init(blueprint: BlueprintModel) {
		if (!blueprint.isRunning) {
			console.error("RunOperatorView only meant for a Blueprint with running operator.")
			return;
		}

		this.blueprint = blueprint;
	}

	public static async sendData(data: SlangTypeValue) {
		try {
			const received = await AppState.sendData(this.blueprint, data);
			this.log.unshift({sent: data, received});
		} catch (err) {
			console.error(err)
		}
	}

}

export class RunOperatorView implements ClassComponent<any> {
	private value: SlangTypeValue | undefined;

	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
		RunningOperator.init(AppState.currentBlueprint!);
	}

    public oncreate(vnode: m.VnodeDOM<any>) {
        const blueprint = AppState.currentBlueprint;
        const el = vnode.dom.getElementsByClassName("slang-editor")[0];
		Editor.init(el as HTMLElement);
		Editor.show(blueprint);
    }

	// @ts-ignore
	public onupdate({attrs}: m.Vnode<any>) {
	}

	public view({attrs}: CVnode<any>) {
        //const blueprint = AppState.activeBlueprint!;
		const that = this;

		return m(".sle-view__run-opr", attrs,
				m(".sle-view__layout",
					m(".sle-view__layout--half-screen",
						m(".sle-view__edit-blupr",
							m(".slang-editor"),
							m(Box, {class: "sle-view__edit-blupr__top-left"}, m(BlueprintControlBar)),
						)
					),
					m(".sle-view__layout--half-screen",
						m(".sle-comp__datalog",
							m(List,
								m(ListEntry,
									m(Block,
										m(Input.ConsoleEntry, {
											type: RunningOperator.inType,
											onInput(value: any) {
												that.value = value;
											},
										}),
										m(Button, {
											full: true,
											notAllowed: that.value === undefined,
											onclick:
												that.value !== undefined
												? () => {
													RunningOperator.sendData(that.value!).then(m.redraw)
												}
												: undefined,
										}, "⏎"),
									),
								),
								RunningOperator.log.map((i) => {
									return m(ListEntry, {
											class: "sle-comp__datalog__log-entry"
										},
										m(".sle-comp__datalog__sent", JSON.stringify(i.sent)),
										m(".sle-comp__datalog__recv", JSON.stringify(i.received)),
									);
								})
							),
						)
					)
				)
		);
	}
}