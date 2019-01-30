import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";

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

export namespace Tk {
	interface ModalAttrs {
		title?: string,
		onClose?: () => void
	}

	export class Modal implements ClassComponent<ModalAttrs> {
		view({children, attrs}: CVnode<ModalAttrs>) {
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
						"X"
					),
					children));
		}
	}

	export class Container implements ClassComponent<{}> {
		view({children, attrs}: CVnode<any>) {
			return m(".sl-container", attrs, children);
		}
	}

	export class Box implements ClassComponent<{}> {
		view({children}: CVnode<{}>) {
			return m(".sl-box", children);
		}
	}

	interface ListAttrs {
		class?: string
		onMouseEnter?: (e: MithrilMouseEvent) => void
		onMouseLeave?: (e: MithrilMouseEvent) => void
		onKey?: {
			[keyevent in keyof Keypress]: (e: MithrilKeyboardEvent) => void
		}
	}

	export class List implements ClassComponent<ListAttrs> {
		oninit() {
		}

		view({children, attrs}: CVnode<ListAttrs>) {
			return m("ul.sl-list", {
				class: attrs.class,
			}, children);
		}
	}

	interface ListItemAttrs {
		class?: string
		onMouseEnter?: (e: MithrilMouseEvent) => void
		onMouseLeave?: (e: MithrilMouseEvent) => void
		onClick?: (e: MithrilMouseEvent) => void
	}

	export class ListItem implements ClassComponent<ListItemAttrs> {
		oninit() {
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
		oninit() {
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

	interface ButtonAttrs {
		onClick?: (e: MithrilMouseEvent) => void
		tooltip?: string
		class?: string
		notAllowed?: boolean
		inactive?: boolean
		full?: boolean
	}

	export class Button implements ClassComponent<ButtonAttrs> {
		private alreadyClicked: boolean = false;
		private bounceInterval = 500;

		oninit() {
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


		view({attrs, children}: CVnode<ButtonAttrs>) {
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
				tooltip: attrs.tooltip,
			}, children);
		}
	}

	export interface InputAttrs<T> {
		label: string,
		class: string,
		autofocus?: boolean,
		initValue?: T,
		onInput: (value: T) => void,
		onchange?: (file: File) => void,
	}

	export interface Input<T> extends ClassComponent<InputAttrs<T>> {
	}

	function wrapInput<T>(attrs: InputAttrs<T>, input: m.Children): any {
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

	export class StringInput implements Input<string> {
		view({attrs}: CVnode<InputAttrs<string>>) {
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
					oninput: m.withAttr("value", function (v: string) {
						attrs.onInput(v);
					}),
					autofocus: attrs.autofocus
				}
			));
		}
	}

	export class NumberInput implements Input<number> {
		view({attrs}: CVnode<InputAttrs<number>>) {
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
					oninput: m.withAttr("value", function (v: number) {
						attrs.onInput(Number(v));
					}),
					autofocus: attrs.autofocus
				}
			));
		}
	}

	export class BooleanInput implements Input<boolean> {
		view({attrs}: CVnode<InputAttrs<boolean>>) {
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
					oninput: m.withAttr("checked", function (v: boolean) {
						attrs.onInput(v);
					}),
					autofocus: attrs.autofocus
				}
			));
		}
	}

	export class FileInput implements Input<File> {
		protected accept: string = "";

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

	export interface SelectInputAttrs extends InputAttrs<string> {
		options: Array<string>
	}

	export class SelectInput implements ClassComponent<SelectInputAttrs> {
		view({attrs}: CVnode<SelectInputAttrs>) {
			return wrapInput(attrs, m("select",
				{
					name: attrs.label,
					oncreate: (v: CVnodeDOM<any>) => {
						if (v.attrs.autofocus) {
							(v.dom as HTMLElement).focus();
						}
					},
					oninput: m.withAttr("value", function (v: string) {
						attrs.onInput(v);
					}),
					autofocus: attrs.autofocus
				},
				attrs.options.map((opt) => {
					return m("option", {
						value: opt,
					}, opt)
				})
			));
		}
	}

}
