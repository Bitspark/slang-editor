import m, {ClassComponent, CVnode} from "mithril";
import { OperatorBoxComponent } from "../../slang/ui/components/blackbox";
import { BlueprintModel } from "../../slang/core/models";
import { ViewFrame } from "../../slang/ui/frame";
import { BlueprintView, SelectableComponent } from "../../slang/ui/views/blueprint";
import { BlueprintControlBar } from "../components/blueprint-control-bar";
import { BlueprintMenu } from "../components/blueprint-menu";
import { OperatorControl } from "../components/operator-control";
import { AppState } from "../state";
import { Floater } from "../../slang/ui/components/toolkit";
import { AttachableComponent } from "src/slang/ui/components/base";

class Editor {
	private static frame: ViewFrame;
    public static blueprintView: BlueprintView;
    public static operatorControl?: AttachableComponent;

    public static init(rootEl: HTMLElement, blueprint: BlueprintModel) {
		this.frame = new ViewFrame(rootEl as HTMLElement);

		const viewArgs = {
			editable: blueprint.isLocal(),
			hscrollable: true,
			vscrollable: true,
			descendable: true,
			runnable: true,
		};

        const blueprintView = new BlueprintView(this.frame, AppState.aspects, blueprint, viewArgs);
		blueprintView.selected.subscribe((e: SelectableComponent | null) => {
            this.destroyOperatorDashboard();
            if (!e) {
				return;
			}

            const selectedOne = e;
			const that = this;

            if (selectedOne instanceof OperatorBoxComponent) {
				this.operatorControl = selectedOne
					.createComponent({x: 0, y: 0, align: "tl"})
					.attachTo(selectedOne.getShape(), "tr")
					.mount({
						view: () => m(Floater, {
								onclose: () => {
									that.destroyOperatorDashboard();
								},
							},
							m(OperatorControl, {
								operator: selectedOne.getModel(),
								view: blueprintView,
								onclose: () => {
									that.destroyOperatorDashboard();
								},
							}),
						),
					});
			}

			return true;
		});
        this.frame.setView(blueprintView);
	}

	private static destroyOperatorDashboard() {
		if (!this.operatorControl) {
			return;
		}
		this.operatorControl.destroy();
		this.operatorControl = undefined;
	}
}

export class EditBlueprintView implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
        AppState.activeBlueprint = AppState.getBlueprint(attrs.uuid)
	}

    public oncreate(vnode: m.VnodeDOM<any, this>) {
        const blueprint = AppState.activeBlueprint;
        if (!blueprint) {
            console.error("EditBlueprintView requires an existing Blueprint.");
            return;
        }

        const el = vnode.dom.getElementsByClassName("slang-editor")[0];
		Editor.init(el as HTMLElement, blueprint);
    }

	public view({attrs}: CVnode<any>) {
        const blueprint = AppState.activeBlueprint!;

		return m(".sle-comp__blueprint-editor", attrs,
            m(".columns", [
                m(BlueprintMenu, {
                    class: "column is-2",
                    exclude: (bp: BlueprintModel) => blueprint.uuid === bp.uuid,
                    onselect(bp: BlueprintModel) {
                        blueprint.createBlankOperator(bp, {position: {x: 0, y: 0}})
                    }
                }),
                m("main.column", [
                    m(BlueprintControlBar),
                    m(".slang-editor"),
                ])
            ])
        );
	}
}