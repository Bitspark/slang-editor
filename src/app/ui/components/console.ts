import m, {ClassComponent, CVnode} from "mithril";
import {SlangType, SlangTypeDef, SlangTypeValue, TypeIdentifier} from "../../custom/type";
import {MithrilMouseEvent, Tk} from "./toolkit";
import {FileValueType, ImageValueType} from "./console/file";
import {GraphValueType} from "./console/graph";

export type ConsoleValueType<T> = {
	typeDef: SlangTypeDef;
	input?: Input.ValueType<T>;
	output?: Output.ValueType<T>;
}

export class ConsoleValueTypeManager {
	private static components: Array<ConsoleValueType<any>> = [];

	private static isEqual(a: SlangTypeDef, b: SlangTypeDef): boolean {
		if (a.type !== b.type) {
			return false;
		}

		switch (a.type) {
			case TypeIdentifier.Map:
				const aMap = a.map;

				if (b.type !== TypeIdentifier.Map) {
					return false;
				}

				const bMap = b.map;

				for (let propKey in aMap) {
					if (aMap.hasOwnProperty(propKey)) {
						if (bMap.hasOwnProperty(propKey)) {
							if (!ConsoleValueTypeManager.isEqual(aMap[propKey], bMap[propKey])) {
								return false;
							}
						} else {
							return false;
						}
					}
				}
				break;

			case TypeIdentifier.Stream:
				if (b.type !== TypeIdentifier.Stream) {
					return false;
				}

				if (!ConsoleValueTypeManager.isEqual(a.stream, b.stream)) {
					return false;
				}
				break;

			case TypeIdentifier.Generic:
				return false;
		}

		return true;
	}

	public static register(comp: ConsoleValueType<any>) {
		if (comp.input || comp.output) {
			ConsoleValueTypeManager.components.unshift(comp);
		} else {
			console.error(`ConsoleValueType ${comp} requires a input or output component`);
		}
	}

	public static findInput(type: SlangType): Input.ValueType<any> | undefined {
		const foundInpComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.input && ConsoleValueTypeManager.isEqual(comp.typeDef, type.getTypeDef()));
		if (foundInpComps.length) {
			return foundInpComps[0].input;
		}
	}

	public static findOutput(type: SlangType): Output.ValueType<any> | undefined {
		const foundOutComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.output && ConsoleValueTypeManager.isEqual(comp.typeDef, type.getTypeDef()));
		if (foundOutComps.length) {
			return foundOutComps[0].output;
		}
	}
}

export namespace Input {
	export interface ValueTypeAttrs<T> extends Tk.InputAttrs<T> {
	}

	export abstract class ValueType<T> implements Tk.Input<T> {
		abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	interface ConsoleEntryAttrs extends Tk.InputAttrs<any> {
		type: SlangType
	}

	export class ConsoleEntry<T> implements ClassComponent<ConsoleEntryAttrs> {
		private type: SlangType | undefined;

		oninit({attrs}: CVnode<ConsoleEntryAttrs>) {
			this.type = attrs.type;
		}

		private getInputComponent(attrs: ConsoleEntryAttrs): any {
			const t = this.type;

			if (!t) {
				return;
			}

			const typeSpecificComp = ConsoleValueTypeManager.findInput(t);

			if (typeSpecificComp) {
				return m(typeSpecificComp, attrs);
			} else {
				switch (t.getTypeIdentifier()) {
					case TypeIdentifier.Map:
						return m(MapInputField, Object.assign(attrs, {
							entries: t.getMapSubs(),
						}));

					case TypeIdentifier.Stream:
						return m(StreamInputField, Object.assign(attrs, {
							type: t.getStreamSub(),
						}));

					case TypeIdentifier.Number:
						return m(Tk.NumberInput, attrs);

					case TypeIdentifier.Boolean:
						return m(Tk.BooleanInput, attrs);

					case TypeIdentifier.Trigger:
						attrs.onInput(null);
						return;

					default:
						return m(Tk.StringInput, attrs);
				}
			}
		}

		view({attrs}: CVnode<ConsoleEntryAttrs>): any {
			return this.getInputComponent(attrs);
		}
	}

	interface MapInputAttrs extends Tk.InputAttrs<{}> {
		entries: IterableIterator<[string, SlangType]>
	}


	class MapInputField implements ClassComponent<MapInputAttrs> {
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
						.map(([subName, subType]) => m(ConsoleEntry, {
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

	interface StreamInputAttrs extends Tk.InputAttrs<{}> {
		type: SlangType
	}

	class StreamInputField implements ClassComponent<StreamInputAttrs> {
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
								m(Tk.Button, {
									onClick: () => {
										that.values[index] = undefined;
										attrs.onInput(that.getValues());
									},
									label: "✖",
									icon: "✖",
									class: "sl-remove-entry",
								}),
								m(ConsoleEntry, {
									label: "", class: "",
									type: attrs.type,
									onInput: (v: any) => {
										that.values[index] = v;
										attrs.onInput(that.getValues());
									}
								}),
							]);
					}),
					m(".entry", m(Tk.Button, {
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
}

export namespace Output {
	export interface ValueTypeAttrs<T> {
		value: T,
		type: SlangType
	}

	export abstract class ValueType<T> implements ClassComponent<ValueTypeAttrs<T>> {
		oncreate?(vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
		}

		onupdate?(vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
		}

		abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	export class ConsoleEntry implements ClassComponent<{ value: any, type: SlangType }> {
		private getOutputComponent(value: any, type: SlangType): any {
			const typeSpecificComp = ConsoleValueTypeManager.findOutput(type);
			if (typeSpecificComp) {
				return m(typeSpecificComp, {value, type});
			} else {
				switch (type.getTypeIdentifier()) {
					case TypeIdentifier.Map:
						return m(".sl-json", Array.from(type.getMapSubs())
							.map(([subName, subType]) => [
								m(".sl-json-pair",
									{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
									m(".sl-json-key", subName),
									m(".sl-json-val", this.getOutputComponent(value[subName], subType)),
								)
							]));
					case TypeIdentifier.Stream:
						const subType = type.getStreamSub();
						return m(".sl-json", value.map((val: any, i: number) => [
							m(".sl-json-pair",
								{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
								m(".sl-json-key", i),
								m(".sl-json-val", this.getOutputComponent(val, subType))
							)
						]));
					default:
						return JSON.stringify(value);
				}
			}
		}

		view({attrs}: CVnode<{ value: any, type: SlangType }>) {
			return this.getOutputComponent(attrs.value, attrs.type);
		}
	}
}

interface InputConsoleAttrs {
	type: SlangType
	onSubmit: (value: SlangTypeValue) => void
}

export class InputConsole implements ClassComponent<InputConsoleAttrs> {
	private type: SlangType | undefined;
	private value: SlangTypeValue | undefined;

	oninit({attrs}: CVnode<InputConsoleAttrs>) {
		this.type = attrs.type;
	}

	private isValid(): boolean {
		return this.value !== undefined;
	}

	private renderInput(type: SlangType): m.Children {
		return m(Input.ConsoleEntry, {
			label: "", class: "",
			type: type!,
			onInput: (v: any) => {
				this.value = v;
			}
		});
	}

	view({attrs}: CVnode<InputConsoleAttrs>): any {
		const that = this;
		return m("form.sl-console-in", {
				class: (that.isValid() ? "sl-invalid" : "")
			},
			this.renderInput(this.type!),
			m(Tk.Button, {
				full: true,
				notAllowed: !that.isValid(),
				label: "Push",
				onClick: that.isValid ? (e: MithrilMouseEvent) => {
					attrs.onSubmit(that.value!);
				} : undefined
			})
		);
	}
}

interface OutputConsoleAttrs {
	type: SlangType;
	onLoad: () => Array<SlangTypeValue>
}

export class OutputConsole implements ClassComponent<OutputConsoleAttrs> {
	private type: SlangType | undefined;

	oninit({attrs}: CVnode<OutputConsoleAttrs>) {
		this.type = attrs.type;
	}

	private renderOutput(value: SlangTypeValue, type: SlangType): m.Children {
		return m(Output.ConsoleEntry, {type, value});
	}

	view({attrs}: CVnode<OutputConsoleAttrs>): any {
		const values = attrs.onLoad();
		const len = values.length;
		return m(Tk.List, {"class": "sl-console-out"},
			values.map((outputData, i) => {
				return m(Tk.ListItem, {key: len - i}, this.renderOutput(outputData, this.type!));
			})
		);
	}
}

ConsoleValueTypeManager.register(FileValueType);
ConsoleValueTypeManager.register(ImageValueType);
ConsoleValueTypeManager.register(GraphValueType);
