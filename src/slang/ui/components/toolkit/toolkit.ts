import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";

import {Keypress, MithrilEvent, MithrilKeyboardEvent, MithrilMouseEvent} from "./events";

interface FormAttrs {
	isValid: boolean;
	submitLabel: string;

	onsubmit(): void;
}

export class Form implements ClassComponent<FormAttrs> {
	public view({attrs, children}: CVnode<FormAttrs>) {
		return m("form", {
				class: (attrs.isValid ? "sl-invalid" : ""),
				onsubmit: (e: Event) => {
					e.preventDefault();
					if (attrs.onsubmit) {
						attrs.onsubmit();
					}
				},
			},
			children,
			attrs.onsubmit ?
				m(Tk.Button, {
					type: "submit",
					full: true,
					notAllowed: !attrs.isValid,
					onClick: attrs.isValid ? () => {
						if (attrs.onsubmit) {
							attrs.onsubmit();
						}
					} : undefined,
				}, attrs.submitLabel) : undefined,
		);
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
	interface ModalAttrs {
		title?: string;

		onClose?(): void;
	}

	export class Modal implements ClassComponent<ModalAttrs> {
		public oninit({attrs}: CVnode<ModalAttrs>) {
			document.addEventListener("keyup", (event: Event) => {
				const e = event as MithrilKeyboardEvent;
				switch (e.key) {
					case "Escape":
						e.redraw = false;
						if (attrs.onClose) {
							attrs.onClose();
						}
						break;
				}
			});
		}

		public view({children, attrs}: CVnode<ModalAttrs>) {
			return m(".sl-modal",
				m(".sl-modal-content",
					attrs.title ? m("span", attrs.title) : undefined,
					m(Button, {
							class: "sl-modal-close",
							onClick: attrs.onClose ? (e: MithrilMouseEvent) => {
								e.redraw = false;
								attrs.onClose!();
							} : undefined,
						},
						"X",
					),
					children));
		}
	}

	export class Container implements ClassComponent<{}> {
		public view({children, attrs}: CVnode<any>) {
			return m(".sl-container", attrs, children);
		}
	}

	export class Box implements ClassComponent<ModalAttrs> {

		public oninit({attrs}: CVnode<ModalAttrs>) {
			document.addEventListener("keyup", (event: Event) => {
				const e = event as MithrilKeyboardEvent;
				switch (e.key) {
					case "Escape":
						e.redraw = false;
						if (attrs.onClose) {
							attrs.onClose();
						}
						break;
				}
			});
		}

		public view({children}: CVnode<ModalAttrs>) {
			return m(".sl-box",
				children);
		}
	}

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

	interface ButtonAttrs {
		tooltip?: string;
		class?: string;
		notAllowed?: boolean;
		inactive?: boolean;
		full?: boolean;
		type?: "button" | "submit" | "reset";

		onClick?(e: MithrilMouseEvent): void;
	}

	export class Button implements ClassComponent<ButtonAttrs> {
		private alreadyClicked: boolean = false;
		private bounceInterval = 500;

		public oninit() {
			return;
		}

		public view({attrs, children}: CVnode<ButtonAttrs>) {
			const that = this;

			return m("a.sl-btn", {
				class: that.getClass(attrs),
				inacitve: that.isInactive(attrs),
				onclick: (that.isClickable(attrs)) ? (e: MithrilMouseEvent) => {
					if (that.alreadyClicked) {
						return;
					}
					that.alreadyClicked = true;
					attrs.onClick!(e);
					setTimeout(() => {
						that.alreadyClicked = false;
					}, that.bounceInterval);
				} : undefined,
				tooltip: attrs.tooltip,
				type: attrs.type,
			}, children);
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
	}

}
