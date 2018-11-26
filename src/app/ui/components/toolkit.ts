import m, {ClassComponent, CVnode, CVnodeDOM} from "mithril";
import {SlangType, SlangTypeDef, TypeIdentifier} from "../../custom/type";

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
	constructor(private inputType: "button" | "number" | "text" | "checkbox" | "file", private className: string) {
	}

	view({attrs}: CVnode<Input.Attrs<T>>) {
		const labelName = attrs.label;
		const labelText = (labelName) ? `${attrs.label}:` : "";
		const that = this;

		return m(`.sl-input.${this.className}`,
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
		super("text", "string");
	}
}

export class NumberInput extends SimpleInput<number> {
	constructor() {
		super("number", "number");
	}
}

export class BooleanInput extends SimpleInput<boolean> {
	constructor() {
		super("checkbox", "boolean");
	}
}

export class FileInput extends SimpleInput<string> {
	constructor() {
		super("file", "file");
	}

}

export class TypeInput implements Input<any, TypeInput.Attrs> {
	//private name: string = "";
	private type: SlangType | undefined;
	private static SpecialInput: Array<[m.ComponentTypes<Input.Attrs<any>, Input<any, Input.Attrs<any>>>, SlangTypeDef]> = [
		[FileInput, {
			type: TypeIdentifier.Map,
			map: {
				file: {type: TypeIdentifier.Binary},
				name: {type: TypeIdentifier.String},
			}
		}],
	];

	oninit({attrs}: CVnode<TypeInput.Attrs>) {
		this.type = attrs.type;
	}

	private getInputComponent(attrs: TypeInput.Attrs): any {
		const t = this.type;

		if (!t) {
			return;
		}

		switch (t.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				const typeDef = t.toSlangTypeDef();
				const foundInpComps = TypeInput.SpecialInput
					.filter(([inp, tyDef]) => Object.is(tyDef, typeDef))
					.map(([inp, _]) => inp);

				if (foundInpComps.length) {
					return m(foundInpComps[0], attrs);
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

	view({attrs}: CVnode<TypeInput.Attrs>): any {
		return this.getInputComponent(attrs);
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

export namespace StreamInput {
	export interface Attrs extends Input.Attrs<{}> {
		type: SlangType
	}
}

