import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";
import {isEqual, SlangType, SlangTypeDef, TypeIdentifier} from "../../custom/type";

export interface MithrilMouseEvent extends MouseEvent {
	redraw: boolean
}

export interface MithrilKeyboardEvent extends KeyboardEvent {
	redraw: boolean
}

export enum Keypress {
	Enter,
	Up,
	Down,
}

export class JSONObj implements ClassComponent<{ value: any }> {

	private getChildren(value: any): any {
		if (value instanceof Object) {
			return Object.keys(value).map((key: string) => [
					m(".sl-json-pair",
						m(".sl-json-key", key),
						m(".sl-json-val", this.getChildren(value[key])),
					)
				]
			);
		} else if (value instanceof Array) {
			return value.map((val: any, i: number) => [
				m(".sl-json-pair",
					m(".sl-json-key", i),
					m(".sl-json-val", this.getChildren(val))
				)
			]);
		} else {
			return JSON.stringify(value);
		}
	}

	view({attrs}: CVnode<{ value: any }>) {
		return m(".sl-json", this.getChildren(attrs.value));
	}
}

export class Container implements ClassComponent<{}> {
	view({children}: CVnode<{}>) {
		return m(".sl-container", children);
	}
}

export class Box implements ClassComponent<{}> {
	view({children}: CVnode<{}>) {
		return m(".sl-box", children);
	}
}

export interface ListAttrs {
	class?: string
	onMouseEnter?: (e: MithrilMouseEvent) => void
	onMouseLeave?: (e: MithrilMouseEvent) => void
	onKey?: {
		[keyevent in keyof Keypress]: (e: MithrilKeyboardEvent) => void
	}
}

export class List implements ClassComponent<ListAttrs> {
	oninit({attrs}: CVnode<ListAttrs>) {
	}

	view({children, attrs}: CVnode<ListAttrs>) {
		return m("ul.sl-list", {
			class: attrs.class,
		}, children);
	}
}

export interface ListItemAttrs {
	class?: string
	onMouseEnter?: (e: MithrilMouseEvent) => void
	onMouseLeave?: (e: MithrilMouseEvent) => void
	onClick?: (e: MithrilMouseEvent) => void
}

export class ListItem implements ClassComponent<ListItemAttrs> {
	oninit({attrs}: CVnode<ListItemAttrs>) {
	}

	view({children, attrs}: CVnode<ListItemAttrs>) {
		return m("li.sl-list-item", {
			class: attrs.class,
			onmouseenter: attrs.onMouseEnter,
			onmouseleave: attrs.onMouseLeave,
			onclick: attrs.onClick,
		}, children);
	}
}

export class ListHead extends ListItem {
	oninit({attrs}: CVnode<ListItemAttrs>) {
	}

	view({children, attrs}: CVnode<ListItemAttrs>) {
		return m("li.sl-list-head", {
			class: attrs.class,
			onmouseenter: attrs.onMouseEnter,
			onmouseleave: attrs.onMouseLeave,
			onclick: attrs.onClick,
		}, children);
	}
}

export interface ButtonAttrs {
	onClick?: (e: MithrilMouseEvent) => void
	label: string
	icon?: string
	class?: string
	notAllowed?: boolean
	inactive?: boolean
	full?: boolean
}

export class Button implements ClassComponent<ButtonAttrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	oninit({attrs}: CVnode<ButtonAttrs>) {
	}


	private getClass(attrs: ButtonAttrs): string {
		const cls = [];

		if (attrs.full) {
			cls.push("sl-fullwidth");
		}

		if (attrs.notAllowed) {
			cls.push("sl-not-allowed");
		}

		if (this.isClickable(attrs)) {
			cls.push("sl-clickable");
		}

		return attrs.class + " " + cls.join(" ");
	}

	private isClickable(attrs: ButtonAttrs): boolean {
		return !!attrs.onClick && !attrs.notAllowed;
	}

	private isInactive(attrs: ButtonAttrs): boolean {
		return !!attrs.notAllowed && !!attrs.inactive;
	}


	view({attrs}: CVnode<ButtonAttrs>) {
		const that = this;

		return m("a.sl-btn", {
				class: that.getClass(attrs),
				inacitve: that.isInactive(attrs),
				onclick: (that.isClickable(attrs)) ? (e: MithrilMouseEvent) => {
					if (!that.alreadyClicked) {
						that.alreadyClicked = true;
						attrs.onClick!(e);
						setTimeout(() => {
							that.alreadyClicked = false;
						}, that.bounceInterval);
					}
				} : undefined,
				tooltip: attrs.label,
			},
			attrs.label);
	}
}

export interface InputAttrs<T> {
	label: string,
	class: string,
	autofocus?: boolean,
	onInput: (value: T) => void,
	onchange?: (file: File) => void,
}

interface Input<T> extends ClassComponent<InputAttrs<T>> {
}

abstract class CompositeInput<T> implements Input<T> {
	public static getTypeDef(): SlangTypeDef {
		return {type: TypeIdentifier.Primitive};
	}

	abstract view(vnode: m.Vnode<InputAttrs<T>, this>): m.Children | void | null;
}

abstract class BaseInput<T> implements Input<T> {
	constructor(private inputType: "button" | "number" | "text" | "checkbox" | "file") {
	}

	view({attrs}: CVnode<InputAttrs<T>>) {
		return wrapInput(attrs, m("input",
			{
				name: attrs.label,
				type: this.inputType,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: m.withAttr("value", function (v: T) {
					attrs.onInput(v);
				}),
				autofocus: attrs.autofocus
			}
		));
	}
}

export function wrapInput<T>(attrs: InputAttrs<T>, input: m.Children): any {
	const labelName = attrs.label;
	const labelText = (labelName) ? `${attrs.label}:` : "";

	return m(`.sl-input`,
		{
			class: attrs.class,
		},
		m(".sl-input-outer",
			[
				labelText ? m("label",
					{
						for: labelName
					},
					labelText,
				) : undefined,
				m(".sl-input-inner",
					m(".sl-input-wrap", input)
				)
			]
		)
	);
}

export class StringInput extends BaseInput<string> {
	constructor() {
		super("text");
	}
}

export class NumberInput extends BaseInput<number> {
	constructor() {
		super("number");
	}
}

export class BooleanInput extends BaseInput<boolean> {
	constructor() {
		super("checkbox");
	}
}

export class FileInput extends BaseInput<File> {
	protected accept: string;

	constructor() {
		super("file");
		this.accept = "";
	}

	view({attrs}: CVnode<InputAttrs<File>>) {
		return wrapInput(attrs, m("input",
			{
				name: attrs.label,
				type: "file",
				accept: (this.accept) ? this.accept : undefined,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: m.withAttr("files", function (files: Array<File>) {
					attrs.onInput(files[0]);
				}),
				autofocus: attrs.autofocus
			}
		));
	}
}

export class ImageInput extends FileInput {
	constructor() {
		super();
		this.accept = "image/*";
	}
}

type CompositeInputType = {
	typeDef: SlangTypeDef;
	component: CompositeInput<any>;
}

function selectFile(file: File, onInput: (_: { content: string, name: string }) => void) {
	const reader = new FileReader();
	reader.onload = function () {
		const data = reader.result as string;
		const base64 = data.substr(data.indexOf(",") + 1);
		onInput({content: "base64:" + base64, name: file.name});
		m.redraw();
	};
	reader.readAsDataURL(file);
}

const FileUploadInput: CompositeInputType = {
	typeDef: {
		type: TypeIdentifier.Map,
		map: {
			file: {type: TypeIdentifier.Binary},
			name: {type: TypeIdentifier.String},
		}
	},

	component: {
		view({attrs}: CVnode<InputAttrs<{ file: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(FileInput, Object.assign(attrs, {
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({file: content, name: name});
					});
				}
			}));
		}
	}
};

const ImageUploadInput: CompositeInputType = {
	typeDef: {
		type: TypeIdentifier.Map,
		map: {
			image: {type: TypeIdentifier.Binary},
			name: {type: TypeIdentifier.String},
		}
	},

	component: {
		view({attrs}: CVnode<InputAttrs<{ image: string, name: string }>>) {
			const origOnInput = attrs.onInput;
			return m(ImageInput, Object.assign(attrs, {
				onInput: (file: File) => {
					selectFile(file, ({content, name}) => {
						origOnInput({image: content, name: name});
					});
				}
			}));
		}
	}
};

export interface TypeInputAttrs extends InputAttrs<any> {
	type: SlangType
}

export class TypeInput implements ClassComponent<TypeInputAttrs> {
	private type: SlangType | undefined;
	private static CompositeInputs: Array<CompositeInputType> = [
		FileUploadInput,
		ImageUploadInput
	];

	oninit({attrs}: CVnode<TypeInputAttrs>) {
		this.type = attrs.type;
	}

	private getInputComponent(attrs: TypeInputAttrs): any {
		const t = this.type;

		if (!t) {
			return;
		}

		switch (t.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				const typeDef = t.toSlangTypeDef();
				const foundInpComps = TypeInput.CompositeInputs
					.filter((inp: CompositeInputType) => isEqual(inp.typeDef, typeDef));

				if (foundInpComps.length) {
					return m(foundInpComps[0].component, attrs);
				}
				return m(MapInputField, Object.assign(attrs, {
					entries: t.getMapSubs(),
				}));

			case TypeIdentifier.Stream:
				return m(StreamInputField, Object.assign(attrs, {
					type: t.getStreamSub(),
				}));

			case TypeIdentifier.Number:
				return m(NumberInput, attrs);

			case TypeIdentifier.Boolean:
				return m(BooleanInput, attrs);

			case TypeIdentifier.Trigger:
				attrs.onInput(null);
				return;

			default:
				return m(StringInput, attrs);
		}
	}

	view({attrs}: CVnode<TypeInputAttrs>): any {
		return this.getInputComponent(attrs);
	}
}

export interface MapInputAttrs extends InputAttrs<{}> {
	entries: IterableIterator<[string, SlangType]>
}

export class MapInputField implements ClassComponent<MapInputAttrs> {
	private values: { [subName: string]: any } = {};

	view({attrs}: CVnode<MapInputAttrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const values = this.values;
		return m(".sl-inp-grp.map", {class: attrs.class},
			m("label", {
				for: labelName
			}, [
				labelText,
				Array.from(attrs.entries)
					.map(([subName, subType]) => m(TypeInput, {
							label: subName,
							type: subType,
							class: "",
							onInput: (v: any) => {
								values[subName] = v;
								attrs.onInput(values);
							}
						})
					)
			])
		);
	}
}

export interface StreamInputAttrs extends InputAttrs<{}> {
	type: SlangType
}

export class StreamInputField implements ClassComponent<StreamInputAttrs> {
	private values: Array<any> = [];

	private getValues(): Array<any> {
		return this.values.filter(v => !(v === null || v === undefined));
	}

	view({attrs}: CVnode<StreamInputAttrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const that = this;

		return m(".sl-inp-grp.stream", {class: attrs.class},
			m("label", {
				for: labelName
			}, [
				labelText,
				that.values.map((entry: any, index: number) => {
					return entry === undefined ? undefined :
						m(".entry", [
							m(Button, {
								onClick: () => {
									that.values[index] = undefined;
									attrs.onInput(that.getValues());
								},
								label: "✖",
								icon: "✖",
								class: "sl-remove-entry",
							}),
							m(TypeInput, {
								label: "", class: "",
								type: attrs.type,
								onInput: (v: any) => {
									that.values[index] = v;
									attrs.onInput(that.getValues());
								}
							}),
						]);
				}),
				m(".entry", m(Button, {
					onClick: () => {
						that.values.push(null);
					},
					label: "✚",
					icon: "✚",
					class: "sl-add-entry",
				}))
			])
		);
	}
}
