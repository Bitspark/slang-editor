import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";
import {buildCssClass, HasSizeAttrs} from ".";
import {MithrilEvent, MithrilKeyboardEvent} from "./events";
import {Icon} from "./icons";

export interface BaseInputAttrs<T> extends HasSizeAttrs {
	label?: string;
	help?: string;
	autofocus?: boolean;
	initValue?: T;
	readonly?: boolean;

	// XXX obsolete, rename to lower case
	onInput(value: T, e?: {redraw: boolean}): void;

	onchange?(file: File): void;

	onkeydown?(e: MithrilKeyboardEvent): void;

	onkeyup?(e: MithrilKeyboardEvent): void;
}


export interface StringInputAttrs<T> extends BaseInputAttrs<T> {
	validationPattern?: RegExp;
}

export interface BaseInput<T> extends ClassComponent<BaseInputAttrs<T>> {
}


export enum ValidationResultType {
	Ready = "ready",
	Valid = "valid",
	Invalid = "invalid",
}

// @ts-ignore
function tacoInput<T>(attrs: BaseInputAttrs<T>, input: m.Children): any {
	return m(".field",
		[
			attrs.label ? m("label.label", attrs.label) : undefined,
			m(".control", input),
			attrs.help ? m("p.help", attrs.help) : undefined,
		]);
}

function wrapInput<T>(attrs: BaseInputAttrs<T>, input: m.Children): any {
	return m(".field", { class: "is-horizontal"	},
	[
		attrs.label
		? m(".field-label", { class: buildCssClass(attrs) }, attrs.label)
		: undefined,

		m(".field-body",
			m(".field",
				m("p.control", input)
			)
		),

		attrs.help
		? m("p.help", attrs.help)
		: undefined,
	])

}

export class StringInput implements BaseInput<string> {
	private validationResult: ValidationResultType = ValidationResultType.Ready;

	public view({attrs}: CVnode<StringInputAttrs<string>>) {
		return wrapInput(attrs, m("input",
			{
				class: `${buildCssClass(attrs, "input")} ${attrs.validationPattern ? this.validationResult : ""}`,
				type: "text",
				value: attrs.initValue,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: (e: MithrilEvent) => {
					if (attrs.validationPattern) {
						const regex = new RegExp(attrs.validationPattern);
						if (e.currentTarget.value) {
							this.validationResult = regex.test(e.currentTarget.value) ? ValidationResultType.Valid : ValidationResultType.Invalid;
							if (this.validationResult === ValidationResultType.Valid) {
								attrs.onInput(e.currentTarget.value, e);
							}
						} else {
							this.validationResult = ValidationResultType.Ready;
						}
					} else {
						attrs.onInput(e.currentTarget.value, e);
					}

					attrs.onInput(e.currentTarget.value, e);
				},
				onkeydown: attrs.onkeydown,
				onkeyup: attrs.onkeyup,
				autofocus: attrs.autofocus,
			},
		));
	}
}

/*
* NumberInput:
* We use type:"text" as input, to allow user to enter the property's name as variable - for example ```$propertyName```
 */
export class NumberInput implements BaseInput<number> {
	private validationResult: ValidationResultType = ValidationResultType.Ready;


	public view({attrs}: CVnode<BaseInputAttrs<number>>) {
		return wrapInput(attrs, m("input",
			{
				class: `input special-number-text-input ${buildCssClass(attrs)} ${this.validationResult}`,
				type: "text",
				value: attrs.initValue,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: (e: MithrilEvent) => {
					const value = e.currentTarget.value;
					let regex: RegExp;

					if (value.startsWith("$")) {
						const validJsonKeyRegex: RegExp = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
						regex = new RegExp(validJsonKeyRegex);
						this.validationResult = regex.test(value) ? ValidationResultType.Valid : ValidationResultType.Invalid;
					} else if (value.length === 0) {
						this.validationResult = ValidationResultType.Ready;
					} else {
						const validNumberRegex: RegExp = /^-?\d+(\.\d+)?$/;
						regex = new RegExp(validNumberRegex);
						this.validationResult = regex.test(value) ? ValidationResultType.Valid : ValidationResultType.Invalid;
					}

					if (this.validationResult === ValidationResultType.Valid) {
						attrs.onInput(value, e);
					}
				},
				onkeydown: attrs.onkeydown,
				onkeyup: attrs.onkeyup,
				autofocus: attrs.autofocus,
			},
		));
	}
}

export class BooleanInput implements BaseInput<boolean> {
	public view({attrs}: CVnode<BaseInputAttrs<boolean>>) {
		return m(".field", [
			m(".control",
				m("label.checkout",
					m("input",
						{
							type: "checkbox",
							checked: attrs.initValue,
							oncreate: (v: CVnodeDOM<any>) => {
								if (v.attrs.autofocus) {
									(v.dom as HTMLElement).focus();
								}
							},
							// @ts-ignore
							oninput: m.withAttr("checked", (v: boolean) => {
								attrs.onInput(v);
							}),
							onkeydown: attrs.onkeydown,
							onkeyup: attrs.onkeyup,
							autofocus: attrs.autofocus,
						},
					),
					m("small", attrs.label ? attrs.label : ""),
				),
			),
			attrs.help ? m("p.help", attrs.help) : undefined,
		]);
	}
}

export class FileInput implements BaseInput<File> {
	protected accept: string = "";

	public view({attrs}: CVnode<BaseInputAttrs<File>>) {
		return m(".file",
			m("file-label",
				m("input",
					{
						class: buildCssClass(attrs, "file-input"),
						type: "file",
						accept: (this.accept) ? this.accept : undefined,
						oncreate: (v: CVnodeDOM<any>) => {
							if (v.attrs.autofocus) {
								(v.dom as HTMLElement).focus();
							}
						},
						// @ts-ignore
						oninput: m.withAttr("files", (files: File[]) => {
							attrs.onInput(files[0]);
						}),
						onkeydown: attrs.onkeydown,
						onkeyup: attrs.onkeyup,
						autofocus: attrs.autofocus,
					},
				),
				m("span.file-cta",
					m("span.file-icon", m(Icon, "upload")),
					m("span.file-label", "Choose a file..."),
				),
			),
		);
	}
}

export class ImageInput extends FileInput {
	constructor() {
		super();
		this.accept = "image/*";
	}
}

interface SelectInputAttrs extends BaseInputAttrs<string> {
	selected?: string;
	options: string[];
}

export class SelectInput implements ClassComponent<SelectInputAttrs> {
	public view({attrs}: CVnode<SelectInputAttrs>) {
		return wrapInput(attrs, m(".select", {class: buildCssClass(attrs)},
			m("select",
				{
					name: attrs.label,
					class: buildCssClass(attrs),
					oncreate: (v: CVnodeDOM<any>) => {
						if (v.attrs.autofocus) {
							(v.dom as HTMLElement).focus();
						}
					},
					oninput: (e: MithrilEvent) => {
						attrs.onInput(e.currentTarget.value, e);
					},
					onkeydown: attrs.onkeydown,
					onkeyup: attrs.onkeyup,
					autofocus: attrs.autofocus,
				},
				attrs.options.map((opt) => {
					return m("option", {
						value: opt,
						selected: attrs.selected === opt,
					}, opt);
				}),
			)));
	}
}
