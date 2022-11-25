import m, {ClassComponent, CVnode} from "mithril";
import { IconButton } from "../../slang/ui/toolkit/buttons";
import { AppState } from "../state";

export class BlueprintControlBar implements ClassComponent<any> {
	// @ts-ignore
	public view({attrs}: CVnode<any>) {
        const blueprint = AppState.currentBlueprint;

		return m("nav.sle-comp__blueprint-ctrl-bar", {
            class: "is-flex is-flex-wrap-nowrap is-align-content-stretch"
        }, [
            m("input.input.ctrl-bar__name", {
                class: "is-flex-grow-3 is-medium",
                type: "text",
                value: blueprint.name,
                disabled: blueprint.isRunning,
                oninput: (!blueprint.isRunning)
                // @ts-ignore
                ? (event) => {
                    blueprint.name = event.target.value
                }
                : undefined,
            }),
            m("small.ctrl-bar__uuid", blueprint.uuid),
            m(".buttons.are-medium", 
                m(IconButton, {
                    class: "is-flex-grow-1",
                    fas: "save",
                    disabled: blueprint.isRunning,
                    onclick() {
                        blueprint.save();
                    },
                }),
                blueprint.isRunning
                ? m(IconButton, { // stop running operator
                    class: "is-flex-grow-1",
                    fas: "stop",
                    async onclick() {
                        await AppState.stopOperator(blueprint);
                        m.redraw();
                    },
                })
                : m(IconButton, { // run operator
                    class: "is-flex-grow-1",
                    fas: "play",
                    async onclick() {
                        await AppState.runOperator(blueprint);
                        m.redraw();
                    },
                })

            ),
        ]);
	}
}