import m, {CVnode} from "mithril";

import {ConsoleValueType, Input} from "../console";
import {StringInput} from "../toolkit/toolkit";

function pre(slangValue: string | undefined): string | undefined {
	if (!slangValue || slangValue.startsWith("base64:")) {
		return undefined;
	}
	return atob(slangValue.substring("base64".length));
}

function post(domValue: string): string {
	return "base64:" + btoa(domValue);
}

export const BINARY_VALUE_TYPE: ConsoleValueType<string> = {
	typeDef: {
		type: "binary",
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<string>>) {
			const origOnInput = attrs.onInput;
			return m(StringInput, Object.assign(attrs, {
					initValue: pre(attrs.initValue),
					onInput: (v: string) => {
						origOnInput(post(v));
					},
				},
			));
		},
	},
};
