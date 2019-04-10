import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";

import {Keypress, MithrilEvent, MithrilKeyboardEvent, MithrilMouseEvent} from "./events";

export interface HasSizeAttrs {
	size?: "small" | "medium" | "large";
}

interface HasEscapeAttrs {
	onescape?(): void;
}

export function buildCssClass(attrs: HasSizeAttrs): string {
	const css: string[] = [];
	css.push("is-" + (attrs.size ? attrs.size! : "medium"));
	return css.join(".");
}

export class Container implements ClassComponent<any> {
	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}

export class Box implements ClassComponent<HasEscapeAttrs> {

	public oninit({attrs}: CVnode<HasEscapeAttrs>) {
		const onescape = attrs.onescape;
		if (!onescape) {
			return;
		}

		document.addEventListener("keyup", (event: Event) => {
			const e = event as MithrilKeyboardEvent;
			if (e.key === "Escape") {
				e.redraw = false;
				onescape();
			}
		});
	}

	public view({attrs, children}: CVnode<HasEscapeAttrs>) {
		return m(".box", attrs, children);
	}
}

export class InputGroup implements ClassComponent<any> {
	public view({attrs, children}: CVnode<any>) {
		return m(".sl-input-grp", attrs, children);
	}
}

export class Block implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("", children);
	}
}

export class Title implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("h5", children);
	}
}

export interface BaseInputAttrs<T> {
	label: string;
	class?: string;
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
	const labelName = attrs.label;
	const labelText = (labelName) ? `${attrs.label}:` : "";

	return m(`.sl-input`,
		{
			class: attrs.class,
			readonly: attrs.readonly,
		},
		m(".sl-input-outer",
			[
				labelText ? m("label",
					{
						for: labelName,
					},
					labelText,
				) : undefined,
				m(".sl-input-inner",
					m(".sl-input-wrap", input),
				),
			],
		),
	);
}

export class StringInput implements BaseInput<string> {
	public view({attrs}: CVnode<BaseInputAttrs<string>>) {
		return wrapInput(attrs, m("input",
			{
				name: attrs.label,
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
				name: attrs.label,
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
		return wrapInput(attrs, m("input",
			{
				name: attrs.label,
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
		));
	}
}

export class FileInput implements BaseInput<File> {
	protected accept: string = "";

	public view({attrs}: CVnode<BaseInputAttrs<File>>) {
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
		return wrapInput(attrs, m("select",
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
		));
	}
}

export namespace Tk {

	interface ListAttrs {
		class?: string;
		onKey?: {
			[keyevent in keyof Keypress]: (e: MithrilKeyboardEvent) => void
		};

		onMouseEnter?(e: MithrilMouseEvent): void;

		onMouseLeave?(e: MithrilMouseEvent): void;
	}

	export class List implements ClassComponent<ListAttrs> {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListAttrs>) {
			return m("ul.sl-list", {
				class: attrs.class,
			}, children);
		}
	}

	interface ListItemAttrs {
		class?: string;

		onMouseEnter?(e: MithrilMouseEvent): void;

		onMouseLeave?(e: MithrilMouseEvent): void;

		onClick?(e: MithrilMouseEvent): void;
	}

	export class ListItem implements ClassComponent<ListItemAttrs> {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListItemAttrs>) {
			return m("li.sl-list-item", {
				class: attrs.class,
				onmouseenter: attrs.onMouseEnter,
				onmouseleave: attrs.onMouseLeave,
				onclick: attrs.onClick,
			}, children);
		}
	}

	export class ListHead extends ListItem {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListItemAttrs>) {
			return m("li.sl-list-head", {
				class: attrs.class,
				onmouseenter: attrs.onMouseEnter,
				onmouseleave: attrs.onMouseLeave,
				onclick: attrs.onClick,
			}, children);
		}
	}

}
