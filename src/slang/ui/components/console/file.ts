import m, {CVnode} from "mithril";
import {Input, Output, ConsoleValueType} from "../console";
import {TypeIdentifier} from "../../../custom/type";
import {Tk} from "../toolkit";

function selectFile(file: File, onInput: (_: { content: string, name: string }) => void) {
	const reader = new FileReader();
	reader.onload = function () {
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


export const FileValueType: ConsoleValueType<{ file: string, name: string }> = {
	typeDef: {
		type: TypeIdentifier.Map,
		map: {
			file: {type: TypeIdentifier.Binary},
			name: {type: TypeIdentifier.String},
		}
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<{ file: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(Tk.FileInput, Object.assign(attrs, {
				initValue: undefined,
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({file: content, name: name});
					});
				}
			}));
		}
	}
};

export const ImageValueType: ConsoleValueType<{ image: string, name: string }> = {
	typeDef: {
		type: TypeIdentifier.Map,
		map: {
			image: {type: TypeIdentifier.Binary},
			name: {type: TypeIdentifier.String},
		}
	},

	input: {
		view({attrs}: CVnode<Input.ValueTypeAttrs<{ image: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(Tk.ImageInput, Object.assign(attrs, {
				initValue: undefined,
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({image: content, name: name});
					});
				}
			}));
		}
	},

	output: {
		view({attrs}: CVnode<Output.ValueTypeAttrs<{ image: string, name: string }>>) {
			return m("img");
		}
	}
};
