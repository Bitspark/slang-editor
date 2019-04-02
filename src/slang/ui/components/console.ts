import m, {ClassComponent, CVnode} from "mithril";

import {SlangType, SlangTypeJson, SlangTypeValue, TypeIdentifier} from "../../definitions/type";

import {BINARY_VALUE_TYPE} from "./console/binary";
import {FILE_VALUE_TYPE, IMAGE_VALUE_TYPE} from "./console/file";
import {GRAPH_VALUE_TYPE} from "./console/graph";
import {Tk} from "./toolkit";

export interface ConsoleValueType<T> {
	typeDef: SlangTypeJson;
	input?: Input.ValueType<T>;
	output?: Output.ValueType<T>;
}

export class ConsoleValueTypeManager {

	public static register(comp: ConsoleValueType<any>) {
		if (comp.input || comp.output) {
			ConsoleValueTypeManager.components.unshift(comp);
		} else {
			console.error(`ConsoleValueType ${comp} requires a input or output component`);
		}
	}

	public static findInput(type: SlangType): Input.ValueType<any> | undefined {
		const foundInpComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.input && SlangTypeDef.isEqual(comp.typeDef, type.getTypeDef()));
		if (foundInpComps.length) {
			return foundInpComps[0].input;
		}
		return undefined;
	}

	public static findOutput(type: SlangType): Output.ValueType<any> | undefined {
		const foundOutComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.output && SlangTypeDef.isEqual(comp.typeDef, type.getTypeDef()));
		if (foundOutComps.length) {
			return foundOutComps[0].output;
		}
		return undefined;
	}

	private static components: Array<ConsoleValueType<any>> = [];
}

export namespace Input {
	export interface ValueTypeAttrs<T> extends Tk.InputAttrs<T> {
	}

	export abstract class ValueType<T> implements Tk.Input<T> {
		public abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	interface ConsoleEntryAttrs extends Tk.InputAttrs<any> {
		type: SlangType;
	}

	export class ConsoleEntry implements ClassComponent<ConsoleEntryAttrs> {
		private type: SlangType | undefined;

		public oninit({attrs}: CVnode<ConsoleEntryAttrs>) {
			this.type = attrs.type;
		}

		public view({attrs}: CVnode<ConsoleEntryAttrs>): any {
			return this.getInputComponent(attrs);
		}

		private getInputComponent(attrs: ConsoleEntryAttrs): any {
			const t = this.type;

			if (!t) {
				return;
			}

			const typeSpecificComp = ConsoleValueTypeManager.findInput(t);

			if (typeSpecificComp) {
				return m(typeSpecificComp, attrs);
			}
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

	interface MapInputAttrs extends Tk.InputAttrs<{ [sub: string]: SlangTypeValue }> {
		entries: IterableIterator<[string, SlangType]>;
	}

	class MapInputField implements ClassComponent<MapInputAttrs> {
		private values = new Map<string, SlangTypeValue>();

		public view({attrs}: CVnode<MapInputAttrs>) {
			if (attrs.initValue) {
				this.values = this.pre(attrs.initValue);
			}

			const labelName = attrs.label;
			const labelText = (labelName) ? `${attrs.label}:` : "";
			const values = this.values;
			return m(".sl-inp-grp.map", {class: attrs.class},
				m("label", {
					for: labelName,
				}, [
					labelText,
					Array.from(attrs.entries)
						.map(([subName, subType]) => m(ConsoleEntry, {
								label: subName,
								type: subType,
								initValue: this.values.get(subName),
								class: "",
								onInput: (v: any) => {
									values.set(subName, v);
									attrs.onInput(this.post(values));
								},
							}),
						),
				]),
			);
		}

		private pre(objectValue: { [sub: string]: SlangTypeValue }): Map<string, SlangTypeValue> {
			const mapValue = new Map<string, SlangTypeValue>();
			for (const sub in objectValue) {
				if (!objectValue.hasOwnProperty(sub)) {
					continue;
				}
				mapValue.set(sub, objectValue[sub]);
			}
			return mapValue;
		}

		private post(mapValue: Map<string, SlangTypeValue>): { [sub: string]: SlangTypeValue } {
			const objectValue: { [sub: string]: SlangTypeValue } = {};
			mapValue.forEach((value, key) => {
				objectValue[key] = value;
			});
			return objectValue;
		}
	}

	interface StreamInputAttrs extends Tk.InputAttrs<any[]> {
		type: SlangType;
	}

	class StreamInputField implements ClassComponent<StreamInputAttrs> {
		private values: any[] = [];

		public view({attrs}: CVnode<StreamInputAttrs>) {
			const labelName = attrs.label;
			const labelText = (labelName) ? `${attrs.label}:` : "";
			const that = this;

			if (attrs.initValue) {
				this.values = attrs.initValue;
			}

			return m(".sl-inp-grp.stream", {class: attrs.class},
				m("label", {
					for: labelName,
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
									class: "sl-remove-entry sl-red",
								}, m("i.fas.fa-times")),
								m(ConsoleEntry, {
									label: "", class: "",
									type: attrs.type,
									initValue: entry,
									onInput: (v: any) => {
										that.values[index] = v;
										attrs.onInput(that.getValues());
									},
								}),
							]);
					}),
					m(".entry", m(Tk.Button, {
						onClick: () => {
							that.values.push(null);
						},
						class: "sl-add-entry",
					}, m("i.fas.fa-plus"))),
				]),
			);
		}

		private getValues(): any[] {
			return this.values.filter((v) => !(v === null || v === undefined));
		}
	}
}

export namespace Output {
	export interface ValueTypeAttrs<T> {
		value: T;
		type: SlangType;
	}

	export abstract class ValueType<T> implements ClassComponent<ValueTypeAttrs<T>> {
		public oncreate?(_vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
			return;
		}

		public onupdate?(_vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
			return;
		}

		public abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	export class ConsoleEntry implements ClassComponent<{ value: any, type: SlangType }> {

		public view({attrs}: CVnode<{ value: any, type: SlangType }>) {
			return this.getOutputComponent(attrs.value, attrs.type);
		}

		private getOutputComponent(value: any, type: SlangType): any {
			const typeSpecificComp = ConsoleValueTypeManager.findOutput(type);
			if (typeSpecificComp) {
				return m(typeSpecificComp, {value, type});
			}

			switch (type.getTypeIdentifier()) {
				case TypeIdentifier.Map: {
					return m(".sl-json", Array.from(type.getMapSubs())
						.map(([subName, subType]) => [
							m(".sl-json-pair",
								{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
								m(".sl-json-key", subName),
								m(".sl-json-val", this.getOutputComponent(value[subName], subType)),
							),
						]));
				}
				case TypeIdentifier.Stream: {
					const subType = type.getStreamSub();
					return m(".sl-json", value.map((val: any, i: number) => [
						m(".sl-json-pair",
							{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
							m(".sl-json-key", i),
							m(".sl-json-val", this.getOutputComponent(val, subType)),
						),
					]));
				}
				default: {
					return JSON.stringify(value);
				}
			}
		}
	}
}

interface InputConsoleAttrs {
	type: SlangType;
	onSubmit(value: SlangTypeValue): void;
}

export class InputConsole implements ClassComponent<InputConsoleAttrs> {
	private type: SlangType | undefined;
	private value: SlangTypeValue | undefined;

	public oninit({attrs}: CVnode<InputConsoleAttrs>) {
		this.type = attrs.type;
	}

	public view({attrs}: CVnode<InputConsoleAttrs>): any {
		const that = this;
		return m("form.sl-console-in", {
				class: (that.isValid() ? "sl-invalid" : ""),
			},
			this.renderInput(this.type!, undefined),
			m(Tk.Button, {
				full: true,
				notAllowed: !that.isValid(),
				onClick: that.isValid ? () => {
					attrs.onSubmit(that.value!);
				} : undefined,
			}, "Push"),
		);
	}

	private isValid(): boolean {
		return this.value !== undefined;
	}

	private renderInput(type: SlangType, initValue: SlangTypeValue | undefined): m.Children {
		return m(Input.ConsoleEntry, {
			initValue,
			label: "", class: "",
			type: type!,
			onInput: (v: any) => {
				this.value = v;
			},
		});
	}
}

interface OutputConsoleAttrs {
	type: SlangType;
	onLoad(): SlangTypeValue[];
}

export class OutputConsole implements ClassComponent<OutputConsoleAttrs> {
	private type: SlangType | undefined;

	public oninit({attrs}: CVnode<OutputConsoleAttrs>) {
		this.type = attrs.type;
	}

	public view({attrs}: CVnode<OutputConsoleAttrs>): any {
		const values = attrs.onLoad();
		const len = values.length;
		return m(Tk.List, {class: "sl-console-out"},
			values.map((outputData, i) => {
				return m(Tk.ListItem, {key: len - i}, this.renderOutput(outputData, this.type!));
			}),
		);
	}

	private renderOutput(value: SlangTypeValue, type: SlangType): m.Children {
		return m(Output.ConsoleEntry, {type, value});
	}
}

ConsoleValueTypeManager.register(BINARY_VALUE_TYPE);
ConsoleValueTypeManager.register(FILE_VALUE_TYPE);
ConsoleValueTypeManager.register(IMAGE_VALUE_TYPE);
ConsoleValueTypeManager.register(GRAPH_VALUE_TYPE);
