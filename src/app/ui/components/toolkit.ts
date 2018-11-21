import m, {CVnodeDOM} from "mithril";
import {ClassComponent, CVnode} from "mithril";
import {SlangType, TypeIdentifier} from "../../custom/type";

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
	}
}

export class ListEntry implements ClassComponent<{}> {
	oninit({attrs}: CVnode<{}>) {
	}

	view({children, attrs}: CVnode<{}>) {
		return m("li.sl-list-enrty", children);
	}
}

export class Button implements ClassComponent<Button.Attrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	oninit({attrs}: CVnode<Button.Attrs>) {
	}

	view({attrs}: CVnode<Button.Attrs>) {
		return m("a.sl-btn", {
				class: attrs.class + (attrs.onClick ? " sl-btn-clickable" : ""),
				onclick: attrs.onClick ? () => {
					if (!this.alreadyClicked) {
						this.alreadyClicked = true;
						attrs.onClick!();
						const that = this;
						setTimeout(() => {
							that.alreadyClicked = false;
						}, this.bounceInterval);
					}
				} : undefined,
				tooltip: attrs.label,
			},
			attrs.label);
	}
}

export namespace Button {
	export interface Attrs {
		onClick?: () => void
		label: string
		icon?: string
		class?: string
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
		const that = this;
		switch (this.type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				return m(MapInputField, {
					label: attrs.label,
					entries: t.getMapSubs(),
					class: attrs.class + " sl-inp-grp stream",
					onInput: attrs.onInput,
				});

			case TypeIdentifier.Stream:
				return m(StreamInputField, {
					label: attrs.label,
					type: t.getStreamSub(),
					class: attrs.class + " sl-inp-grp map",
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

	view({attrs}: CVnode<StreamInput.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const values = this.values;

		return m("div", {class: attrs.class},
			m("label", {
				for: labelName
			}, [
				labelText,
				this.values.map((entry: any, index: number) => {
					return m(".entry", [
						m(TypeInput, {
							label: "", class: "",
							type: attrs.type,
							onInput: (v: any) => {
								values[index] = v;
								attrs.onInput(values.filter(v => v !== null));
							}
						}),
						m(Button, {
							onClick: () => {
								this.values.splice(index, 1);
								attrs.onInput(values.filter(v => v !== null));
							},
							label: "-",
							icon: "-",
							class: "delete",
						})
					]);
				}),
				m(".entry", m(Button, {
					onClick: () => {
						this.values.push(null);
					},
					label: "+",
					icon: "+",
					class: "add",
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
