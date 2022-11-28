import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import { AppState } from "../state";
import { Block } from "../../slang/ui/toolkit";
import {Input} from "../components/console";
import {SlangType, SlangTypeValue} from "../../slang/definitions/type";
import {List, ListEntry} from "../components/toolkit/list";
import {Button} from "../../slang/ui/toolkit/buttons";
import {BlueprintEditor, BlueprintEditorTopBar} from "../components/blueprint-editor";

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

	// @ts-ignore
    public oncreate(vnode: m.VnodeDOM<any>) {
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
						m(BlueprintEditor,
							m(BlueprintEditorTopBar, m(BlueprintControlBar)),
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
											disabled: that.value === undefined,
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