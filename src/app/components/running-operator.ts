import m, {ClassComponent, CVnode} from "mithril";
import { AppState } from "../state";
import {TextWithCopyButton} from "./toolkit/text-with-copy-button";

export class RunningOperator implements ClassComponent<any> {
    // @ts-ignore
    public view({attrs}: CVnode<any>) {
        const blueprint = AppState.currentBlueprint;

        if (!blueprint.runningOperator) {
            return;
        }

        const rop = blueprint.runningOperator

        return m(".sle-comp__running-operator", [
            m("strong", "URL"),
            m(".running-operator__url", m(TextWithCopyButton, rop.url)),
            m("strong", "input format"),
            m(".running-operator__in-out-type", JSON.stringify(rop.in.jsonify()) ),
            m("strong", "output format"),
            m(".running-operator__in-out-type", JSON.stringify(rop.out.jsonify()) ),
        ]);
	}
}