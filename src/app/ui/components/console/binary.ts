import m, {CVnode} from "mithril";
import {Input, ConsoleValueType} from "../console";
import {TypeIdentifier} from "../../../custom/type";
import {Tk} from "../toolkit";

function pre(slangValue: string | undefined): string | undefined {
	if (!slangValue || slangValue.startsWith("base64:")) {
		return undefined;
	}
	return atob(slangValue.substring("base64".length));
}

function post(domValue: string): string {
	return "base64:" + btoa(domValue);
}

export const BinaryValueType: ConsoleValueType<string> = {
	typeDef: {
		type: TypeIdentifier.Binary
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<string>>) {
			const origOnInput = attrs.onInput;
			return m(Tk.StringInput, Object.assign(attrs, {
					initValue: pre(attrs.initValue),
					onInput: (v: string) => {
						origOnInput(post(v));
					},
				}
			));
		}
	}
};