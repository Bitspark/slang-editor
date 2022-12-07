import m, {ClassComponent, CVnode} from "mithril";
import { IconButton } from "../../slang/ui/toolkit/buttons";
import { AppState } from "../state";
import {SlangFileJson} from "../../slang/definitions/api";

function download(slangFile: SlangFileJson) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
        new Blob([JSON.stringify(slangFile)], {
            type: 'application/binary'}
        )
    )
    a.setAttribute("download", `${slangFile.main}.slang`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

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
                }),
                m(IconButton, { // download slang file
                    class: "is-flex-grow-1",
                    fas: "download",
                    async onclick() {
                        download(AppState.exportSlangFile(blueprint));
                    },
                })
            ),
        ]);
	}
}