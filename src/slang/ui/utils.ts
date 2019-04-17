import {TypeIdentifier} from "../definitions/type";

export function tid2css(tid: TypeIdentifier | "ghost"): string {
	if (tid === "ghost") {
		return "sl-type-ghost";
	}
	return `sl-type-${TypeIdentifier[tid].toLowerCase()}`;
}
