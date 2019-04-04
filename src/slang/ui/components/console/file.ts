import m, {CVnode} from "mithril";

import {ConsoleValueType, Input, Output} from "../console";
import {Tk} from "../toolkit";

function selectFile(file: File, onInput: (value: { content: string, name: string }) => void) {
	const reader = new FileReader();
	reader.onload = () => {
		// e.g.: "data:application/pdf;base64,JVBERi0xLj..."
		//       "data:image/jpeg;base64,/9j/4QyIRXhpZgA..."
		const base64Prefix = "base64,";
		const data = reader.result as string;
		const base64 = data.substr(data.indexOf(base64Prefix) + base64Prefix.length);
		onInput({content: `base64:${base64}`, name: file.name});
		m.redraw();
	};
	reader.readAsDataURL(file);
}

export const FILE_VALUE_TYPE: ConsoleValueType<{ file: string, name: string }> = {
	typeDef: {
		type: "map",
		map: {
			file: {type: "binary"},
			name: {type: "string"},
		},
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<{ file: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(Tk.FileInput, Object.assign(attrs, {
				initValue: undefined,
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({name, file: content});
					});
				},
			}));
		},
	},
};

export const IMAGE_VALUE_TYPE: ConsoleValueType<{ image: string, name: string }> = {
	typeDef: {
		type: "map",
		map: {
			image: {type: "binary"},
			name: {type: "string"},
		},
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<{ image: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(Tk.ImageInput, Object.assign(attrs, {
				initValue: undefined,
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({name, image: content});
					});
				},
			}));
		},
	},

	output: {
		view({}: CVnode<Output.ValueTypeAttrs<{ image: string, name: string }>>) {
			return m("img");
		},
	},
};
