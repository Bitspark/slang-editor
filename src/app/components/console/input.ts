import m, {ClassComponent, CVnode} from "mithril";
import {SlangType, SlangTypeValue, TypeIdentifier} from "../../../slang/definitions/type";
import {Button} from "../../../slang/ui/toolkit/buttons";
import {Icon} from "../../../slang/ui/toolkit/icons";
import {BaseInput, BaseInputAttrs, BooleanInput, NumberInput, StringInput} from "../../../slang/ui/toolkit/input";
import {ConsoleValueTypeManager} from "."

export namespace Input {
	export interface ValueTypeAttrs<T> extends BaseInputAttrs<T> {
	}

	export abstract class ValueType<T> implements BaseInput<T> {
		public abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	interface ConsoleEntryAttrs extends BaseInputAttrs<any> {
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
	}

	interface MapInputAttrs extends BaseInputAttrs<{ [sub: string]: SlangTypeValue }> {
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
			return m(".sl-inp-grp.map",
				m("label", {
					for: labelName,
				}, [
					labelText,
					Array.from(attrs.entries)
						.map(([subName, subType]) => m(ConsoleEntry, {
								label: subName,
								type: subType,
								initValue: this.values.get(subName),
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

	interface StreamInputAttrs extends BaseInputAttrs<any[]> {
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

			return m(".sl-inp-grp.stream",
				m("label", {
					for: labelName,
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
								}, m(Icon, {fas: "times"})),
								m(ConsoleEntry, {
									type: attrs.type,
									initValue: entry,
									onInput: (v: any) => {
										that.values[index] = v;
										attrs.onInput(that.getValues());
									},
								}),
							]);
					}),
					m(".entry", m(Button, {
						onClick: () => {
							that.values.push(null);
						},
					}, m(Icon, {fas: "plus"}))),
				]),
			);
		}

		private getValues(): any[] {
			return this.values.filter((v) => !(v === null || v === undefined));
		}
	}
}
