import m, {CVnodeDOM} from "mithril";
import {ClassComponent, CVnode} from "mithril";
import {SlangType, TypeIdentifier} from "../../custom/type";

export class Button implements ClassComponent<Button.Attrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	oninit({attrs}: CVnode<Button.Attrs>) {
	}

	view({attrs}: CVnode<Button.Attrs>) {
		return m("a.btn.sl-tool-btn", {
				class: attrs.class,
				onclick: () => {
					if (!this.alreadyClicked) {
						this.alreadyClicked = true;
						attrs.onClick();
						const that = this;
						setTimeout(() => {
							that.alreadyClicked = false;
						}, this.bounceInterval);
					}
				},
				tooltip: attrs.label,
			},
			attrs.icon);
	}
}

export namespace Button {
	export interface Attrs {
		onClick: () => void
		label: string
		icon: string
		class: string
	}
}


class Input implements ClassComponent<Input.Attrs> {
	constructor(private inputType: "button" | "number" | "text" | "checkbox") {
	}

	view({attrs}: CVnode<Input.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";

		return m("div.sl-inp-wrap",
			m("label", {
					for: labelName
				}, [
					labelText,
					m(".sl-inp", {
							class: attrs.class
						},
						m("input", {
							name: labelName,
							type: this.inputType,
							oncreate: (v: CVnodeDOM<any>) => {
								if (v.attrs.autofocus) {
									(v.dom as HTMLElement).focus();
								}
							},
							oninput: m.withAttr("value", function (value: any) {
								if (attrs.onInput) {
									attrs.onInput(value);
								}
							}),
							autofocus: attrs.autofocus,
						})
					)
				]
			)
		);
	}
}

export namespace Input {
	export interface Attrs {
		label: string,
		class: string,
		autofocus?: boolean,
		onInput?: (value: any) => void,
	}
}

export class StringInput extends Input {
	constructor() {
		super("text");
	}
}

export class NumberInput extends Input {
	constructor() {
		super("number");
	}
}

export class TriggerInput extends Input {
	constructor() {
		super("button");
	}
}

export class BooleanInput extends Input {
	constructor() {
		super("checkbox");
	}
}


export class TypeInput implements ClassComponent<TypeInput.Attrs> {
	protected name: string = "";
	protected type: SlangType | undefined;

	oninit({attrs}: CVnode<TypeInput.Attrs>) {
		this.type = attrs.type;
		this.name = attrs.name;
	}

	view({attrs}: CVnode<TypeInput.Attrs>): any {
		if (!this.type) return m(".sl-inp.undef");
		const t = this.type;
		switch (this.type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				return m(MapInputField, {
					label: this.name,
					entries: t.getMapSubs(),
					class: "sl-inp-grp stream"
				});

			case TypeIdentifier.Stream:
				return m(StreamInputField, {
					label: this.name,
					type: t.getStreamSub(),
					class: "sl-inp-grp map"
				});

			case TypeIdentifier.Number:
				return m(NumberInput, {
					label: this.name,
					class: "number",
				});

			case TypeIdentifier.Boolean:
				return m(BooleanInput, {
					label: this.name,
					class: "boolean",
				});

			case TypeIdentifier.Trigger:
				return m(TriggerInput, {
					label: this.name,
					class: "trigger",
				});

			default:
				return m(StringInput, {
					label: this.name,
					class: "string",
				});
		}
	}
}

export namespace TypeInput {
	export interface Attrs {
		name: string;
		type: SlangType
	}
}

export class MapInputField implements ClassComponent<MapInput.Attrs> {
	view({attrs}: CVnode<MapInput.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		return m("div", {class: attrs.class},
			m("label", {
				for: labelName
			}, [
				labelText,
				Array.from(attrs.entries)
					.map(([subName, subType]) => m(TypeInput, {
							name: subName,
							type: subType
						})
					)
			])
		);
	}
}

export namespace MapInput {
	export interface Attrs {
		label: string,
		entries: IterableIterator<[string, SlangType]>
		class: string,
	}
}


export class StreamInputField implements ClassComponent<StreamInput.Attrs> {
	private entries: Array<any> = [];

	view({attrs}: CVnode<StreamInput.Attrs>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";

		return m("div", {class: attrs.class},
			m("label", {
				for: labelName
			}, [
				labelText,
				this.entries.map((entry: any, index: number) => {
					return m(".entry", [
						m(TypeInput, {name: "", type: attrs.type}),
						m(Button, {
							onClick: () => {
								this.entries.splice(index, 1);
							},
							label: "-",
							icon: "-",
							class: "delete",
						})
					]);
				}),
				m(".entry", m(Button, {
					onClick: () => {
						this.entries.push("");
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
	export interface Attrs {
		label: string
		type: SlangType
		class: string,
	}
}
