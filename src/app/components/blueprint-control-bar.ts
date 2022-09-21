import m, {ClassComponent, CVnode} from "mithril";
import { AppState } from "../state";

export class BlueprintControlBar implements ClassComponent<any> {
	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
	}

	// @ts-ignore
	public view({attrs}: CVnode<any>) {
        const blueprint = AppState.activeBlueprint!;

		return m("nav.sle-comp__blueprint-ctrl-bar", {
            class: "is-flex is-flex-wrap-nowrap is-align-content-stretch"
        }, [
            m("input.input.ctrl-bar__name", {
                class: "is-flex-grow-3",
                type: "text",
                value: blueprint.name,
                // @ts-ignore
                oninput(event) {
                    blueprint.name = event.target.value
                },
            }),
        ]);
	}
}