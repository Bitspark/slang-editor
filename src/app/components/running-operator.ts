import m, {ClassComponent, CVnode} from "mithril";
import { AppState } from "../state";

export class RunningOperator implements ClassComponent<any> {
    // @ts-ignore
    public view({attrs}: CVnode<any>) {
        const blueprint = AppState.currentBlueprint;

        if (!blueprint.runningOperator) {
            return;
        }

        const rop = blueprint.runningOperator

        return m(".sle-comp__running-operator", [
            m(".running-operator--url", rop.url ),
            m(".running-operator--url", JSON.stringify(rop.in) ),
            m(".running-operator--url", JSON.stringify(rop.out) ),
        ]);
	}
}