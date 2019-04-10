import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";

import {MithrilEvent, MithrilKeyboardEvent} from "./events";

export interface BaseInputAttrs<T> {
	label?: string;
	help?: string;
	autofocus?: boolean;
	initValue?: T;
	readonly?: boolean;

	onInput(value: T, e?: { redraw: boolean }): void;

	onchange?(file: File): void;

	onkeydown?(e: MithrilKeyboardEvent): void;

	onkeyup?(e: MithrilKeyboardEvent): void;
}

export interface BaseInput<T> extends ClassComponent<BaseInputAttrs<T>> {
}

function wrapInput<T>(attrs: BaseInputAttrs<T>, input: m.Children): any {
	return m(".field",
		[
			attrs.label ? m("label.label", attrs.label) : undefined,
			m(".control", input),
			attrs.help ? m("p.help", attrs.help) : undefined,
		]);
}

export class StringInput implements BaseInput<string> {
	public view({attrs}: CVnode<BaseInputAttrs<string>>) {
		return wrapInput(attrs, m("input",
			{
				class: "input",
				type: "text",
				value: attrs.initValue,
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
		));
	}
}

export class NumberInput implements BaseInput<number> {
	public view({attrs}: CVnode<BaseInputAttrs<number>>) {
		return wrapInput(attrs, m("input",
			{
				class: "input",
				type: "number",
				value: attrs.initValue,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: (e: MithrilEvent) => {
					attrs.onInput(Number(e.currentTarget.value), e);
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
							oninput: m.withAttr("checked", (v: boolean) => {
								attrs.onInput(v);
							}),
							onkeydown: attrs.onkeydown,
							onkeyup: attrs.onkeyup,
							autofocus: attrs.autofocus,
						},
					),
					" " + attrs.label,
				),
			),
			attrs.help ? m("p.help", attrs.help) : undefined,
		]);
	}
}

export class FileInput implements BaseInput<File> {
	protected accept: string = "";

	public view({attrs}: CVnode<BaseInputAttrs<File>>) {
		return wrapInput(attrs, m("input",
			{
				type: "file",
				accept: (this.accept) ? this.accept : undefined,
				oncreate: (v: CVnodeDOM<any>) => {
					if (v.attrs.autofocus) {
						(v.dom as HTMLElement).focus();
					}
				},
				oninput: m.withAttr("files", (files: File[]) => {
					attrs.onInput(files[0]);
				}),
				onkeydown: attrs.onkeydown,
				onkeyup: attrs.onkeyup,
				autofocus: attrs.autofocus,
			},
		));
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
		return wrapInput(attrs, m(".select",
			m("select",
				{
					name: attrs.label,
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
