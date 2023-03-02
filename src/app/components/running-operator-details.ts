import m, {ClassComponent, CVnode} from "mithril";
import {AppState} from "../state";
import {TextWithCopyButton} from "./toolkit/text-with-copy-button";
import {RunningOperator} from "../../slang/core/models/blueprint";
import {SlangType} from "../../slang/definitions/type";

function getCurlRequestExample(rop: RunningOperator): string {
    return `curl -X POST ${AppState.APIURL}${rop.url} -H "Content-Type: application/json" -d '${stringifySlangType(rop.in)}' `
}

function stringifySlangType(t: SlangType) {
    if (t.isTriggerLike()) {
        return JSON.stringify(null)
    }
    return JSON.stringify(t.jsonify())
}

export class RunningOperatorDetails implements ClassComponent<any> {
    // @ts-ignore
    public view({attrs}: CVnode<any>) {
        const blueprint = AppState.currentBlueprint;

        if (!blueprint.runningOperator) {
            return;
        }

        const rop = blueprint.runningOperator

        return m(".sle-comp__running-operator", [
            m("strong", "URL"),
            m(".running-operator__detail", m(TextWithCopyButton, rop.url)),
            m("strong", "input format"),
            m(".running-operator__detail", stringifySlangType(rop.in)),
            m("strong", "output format"),
            m(".running-operator__detail", stringifySlangType(rop.out)),
            m("strong", "cURL"),
            m(".running-operator__curl-example", m(TextWithCopyButton, getCurlRequestExample(rop)) ),
        ]);
	}
}