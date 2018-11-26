import m, {CVnodeDOM} from "mithril";
import {ClassComponent, CVnode} from "mithril";
import {SlangType, TypeIdentifier} from "../../custom/type";

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

export class List implements ClassComponent<List.Attrs> {
	oninit({attrs}: CVnode<List.Attrs>) {
	}

	view({children, attrs}: CVnode<List.Attrs>) {
		return m("ul.sl-list", {
			class: attrs.class,
		}, children);
	}
}

export namespace List {
	export interface Attrs {
		class?: string
		onMouseEnter?: (e: MithrilMouseEvent) => void
		onMouseLeave?: (e: MithrilMouseEvent) => void
		onKey?: {
			[keyevent in keyof Keypress]: (e: MithrilKeyboardEvent) => void
		}
	}
}

export class ListItem implements ClassComponent<ListItem.Attrs> {
	oninit({attrs}: CVnode<ListItem.Attrs>) {
	}

	view({children, attrs}: CVnode<ListItem.Attrs>) {
		return m("li.sl-list-item", {
			class: attrs.class,
			onmouseenter: attrs.onMouseEnter,
			onmouseleave: attrs.onMouseLeave,
			onclick: attrs.onClick,
		}, children);
	}
}

export class ListHead extends ListItem {
	oninit({attrs}: CVnode<ListItem.Attrs>) {
	}

	view({children, attrs}: CVnode<ListItem.Attrs>) {
		return m("li.sl-list-head", {
			class: attrs.class,
			onmouseenter: attrs.onMouseEnter,
			onmouseleave: attrs.onMouseLeave,
			onclick: attrs.onClick,
		}, children);
	}
}

export namespace ListItem {
	export interface Attrs {
		class?: string
		onMouseEnter?: (e: MithrilMouseEvent) => void
		onMouseLeave?: (e: MithrilMouseEvent) => void
		onClick?: (e: MithrilMouseEvent) => void
	}
}

export class Button implements ClassComponent<Button.Attrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	oninit({attrs}: CVnode<Button.Attrs>) {
	}


	private getClass(attrs: Button.Attrs): string {
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

	private isClickable(attrs: Button.Attrs): boolean {
		return !!attrs.onClick && !attrs.notAllowed;
	}

	private isInactive(attrs: Button.Attrs): boolean {
		return !!attrs.notAllowed && !!attrs.inactive;
	}


	view({attrs}: CVnode<Button.Attrs>) {
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

export namespace Button {
	export interface Attrs {
		onClick?: (e: MithrilMouseEvent) => void
		label: string
		icon?: string
		class?: string
		notAllowed?: boolean
		inactive?: boolean
		full?: boolean
	}
}

interface Input<T, A extends Input.Attrs<T>> extends ClassComponent<A> {
}

abstract class SimpleInput<T> implements Input<T, Input.Attrs<T>> {
	constructor(private inputType: "button" | "number" | "text" | "checkbox") {
	}

	view({attrs}: CVnode<Input.Attrs<T>>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const that = this;

		return m(".sl-input",
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
						m(".sl-input-wrap",
							m("input",
								{
									name: labelName,
									type: that.inputType,
									oncreate: (v: CVnodeDOM<any>) => {
										if (v.attrs.autofocus) {
											(v.dom as HTMLElement).focus();
										}
									},
									oninput: m.withAttr("value", function (v: any) {
										attrs.onInput(v);
									}),
									autofocus: attrs.autofocus,
								}
							)
						)
					)
				]
			)
		);
	}
}

export namespace Input {
	export interface Attrs<T> {
		label: string,
		class: string,
		autofocus?: boolean,
		onInput: (value: T) => void,
	}
}

export class StringInput extends SimpleInput<string> {
	constructor() {
		super("text");
	}
}

export class NumberInput extends SimpleInput<number> {
	constructor() {
		super("number");
	}
}

export class BooleanInput extends SimpleInput<Boolean> {
	constructor() {
		super("checkbox");
	}
}


export class TypeInput implements Input<any, TypeInput.Attrs> {
	//private name: string = "";
	private type: SlangType | undefined;

	oninit({attrs}: CVnode<TypeInput.Attrs>) {
		this.type = attrs.type;
	}

	view({attrs}: CVnode<TypeInput.Attrs>): any {
		if (!this.type) return m(".sl-inp.undef");
		const t = this.type;
		switch (this.type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				return m(MapInputField, {
					label: attrs.label,
					entries: t.getMapSubs(),
					class: attrs.class + " sl-inp-grp map",
					onInput: attrs.onInput,
				});

			case TypeIdentifier.Stream:
				return m(StreamInputField, {
					label: attrs.label,
					type: t.getStreamSub(),
					class: attrs.class + " sl-inp-grp stream",
					onInput: attrs.onInput,
				});

			case TypeIdentifier.Number:
				return m(NumberInput, {
					label: attrs.label,
					class: attrs.class + " number",
					onInput: attrs.onInput,
				});

			case TypeIdentifier.Boolean:
				return m(BooleanInput, {
					label: attrs.label,
					class: attrs.class + " boolean",
					onInput: attrs.onInput,
				});

			case TypeIdentifier.Trigger:
				attrs.onInput(null);
				return;

			default:
				return m(StringInput, {
					label: attrs.label,
					class: attrs.class + " string",
					onInput: attrs.onInput,
				});
		}
	}
}

export namespace TypeInput {
	export interface Attrs extends Input.Attrs<any> {
		type: SlangType
	}
}

export class MapInputField implements ClassComponent<MapInput.Attrs> {
	private values: { [subName: string]: any } = {};

	view({attrs}: CVnode<MapInput.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const values = this.values;
		return m("div", {class: attrs.class},
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

export namespace MapInput {
	export interface Attrs extends Input.Attrs<{}> {
		entries: IterableIterator<[string, SlangType]>
	}
}


export class StreamInputField implements ClassComponent<StreamInput.Attrs> {
	private values: Array<any> = [];

	private getValues(): Array<any> {
		return this.values.filter(v => !(v === null || v === undefined));
	}

	view({attrs}: CVnode<StreamInput.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const that = this;

		return m("div", {class: attrs.class},
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

export namespace StreamInput {
	export interface Attrs extends Input.Attrs<{}> {
		type: SlangType
	}
}
