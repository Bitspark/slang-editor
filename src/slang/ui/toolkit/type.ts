import m, {ClassComponent, CVnode} from "mithril";

import {toTypeIdentifier} from "../../core/mapper";
import {SlangType, TypeIdentifier} from "../../definitions/type";

import {Block} from "./";
import {IconButton} from "./buttons";
import {MithrilKeyboardEvent} from "./events";
import {BaseInputAttrs, SelectInput, StringInput} from "./input";

const TYPE_OPTIONS = Object.keys(TypeIdentifier).filter((i) => typeof (TypeIdentifier as any)[i] === "number")

export interface MapEntriesInputAttrs {
	entries: Array<[string, SlangType]>;
	excludeTypes?: TypeIdentifier[];

	onremoveEntry(idx: number): void;

	onappendEntry(entry: [string, SlangType]): void;

	oneditEntry(idx: number, entry: [string, SlangType]): void;
}

export class MapEntriesInput implements ClassComponent<MapEntriesInputAttrs> {
	private static hasNameCollision(idx: number, ntname: string, entries: Array<[string, SlangType]>): boolean {
		return entries.filter((e: [string, SlangType], i) => i !== idx && e[0] === ntname).length > 0;
	}

	public view({attrs}: CVnode<MapEntriesInputAttrs>) {
		const entries = attrs.entries;
		const excludeTypes = attrs.excludeTypes;

		return m("", [
			entries.map(([tname, type], index: number) => {
				return m(".is-flex.is-flex-direction-row", {
					class: (MapEntriesInput.hasNameCollision(index, tname, entries)) ? "sl-error" : "",
				}, [
					m(IconButton, {
						size: "small",
						color: "text",
						fas: "minus",

						tooltip: "Remove entry",
						onClick: () => {
							attrs.onremoveEntry(index);
						},
					}),
					m(StringInput, {
						label: "",
						size: "small",
						initValue: tname,
						onInput(ntname: string) {
							attrs.oneditEntry(index, [ntname, type]);
						},
						onkeydown: (e: MithrilKeyboardEvent) => {
							switch (e.key) {
								case "Enter":
									attrs.onappendEntry(["", type]);
									break;
							}
						},
					}),
					m(TypeSelect, {
						type,
						excludeTypes,
						label: "",
						size: "small",
						onInput: (ntype: SlangType) => {
							attrs.oneditEntry(index, [tname, ntype]);
						},
					}),
				]);
			}),
			m("", m(IconButton, {
				size: "small",
				color: "text",
				fas: "plus",

				tooltip: "Add entry",
				onClick: () => {
					attrs.onappendEntry(["", SlangType.newUnspecified()]);
				},
			})),
		]);
	}

}

interface TypeSelectAttrs extends BaseInputAttrs<SlangType> {
	type: SlangType;
	excludeTypes?: TypeIdentifier[];
}

export class MapTypeSelectInput implements ClassComponent<TypeSelectAttrs> {
	private mapEntries: Array<[string, SlangType]> = [];

	public oninit({attrs}: CVnode<TypeSelectAttrs>) {
		this.mapEntries = Array.from(attrs.type.getMapSubs());
	}

	public view({attrs}: CVnode<TypeSelectAttrs>) {
		const that = this;
		return m(MapEntriesInput, {
			entries: this.mapEntries,
			excludeTypes: attrs.excludeTypes,

			onremoveEntry(idx: number) {
				that.mapEntries.splice(idx, 1);
				attrs.onInput(that.getMapSlangType(that.mapEntries));
			},

			onappendEntry(entry: [string, SlangType]) {
				that.mapEntries.push(entry);
				attrs.onInput(that.getMapSlangType(that.mapEntries));
			},

			oneditEntry(idx: number, entry: [string, SlangType]) {
				that.mapEntries[idx] = entry;
				attrs.onInput(that.getMapSlangType(that.mapEntries));
			},
		});
	}

	private getMapSlangType(mapEntries: Array<[string, SlangType]>): SlangType {
		const nMap = SlangType.newMap();
		mapEntries.forEach(([tname, type]) => nMap.addMapSub(tname, type));
		return nMap;
	}
}

export class StreamTypeSelectInput implements ClassComponent<TypeSelectAttrs> {
	public view({attrs}: CVnode<TypeSelectAttrs>) {
		const that = this;
		const t = attrs.type;
		return m(TypeSelect, {
			type: t.getStreamSub(),
			excludeTypes: attrs.excludeTypes,
			onInput: (ntype: SlangType) => {
				attrs.onInput(that.getStreamSlangType(ntype));
			},
		});
	}

	private getStreamSlangType(streamSub: SlangType): SlangType {
		return SlangType.newStream().setStreamSub(streamSub);
	}
}

export class TypeSelect implements ClassComponent<TypeSelectAttrs> {
	private portTypeOptions!: string[];
	private dfltExcludeTypes = [TypeIdentifier.Generic]

	public oninit({attrs}: CVnode<TypeSelectAttrs>): any {
		const excludeTypes = this.dfltExcludeTypes.concat(attrs.excludeTypes || []).map((ti) => TypeIdentifier[ti]);
		this.portTypeOptions = TYPE_OPTIONS.filter((i) => !excludeTypes.includes(i));
	}

	public view({attrs}: CVnode<TypeSelectAttrs>): m.Children {
		const t = attrs.type;
		const ti = t.getTypeIdentifier();

		switch (ti) {
			case TypeIdentifier.Map:
				return m(Block,
					this.renderInput(attrs),
					m(MapTypeSelectInput, {
						...attrs,
						excludeTypes: this.dfltExcludeTypes.concat([TypeIdentifier.Unspecified], attrs.excludeTypes || [])
					}));

			case TypeIdentifier.Stream:
				return m(".is-flex.is-flex-direction-row",
					this.renderInput(attrs),
					m(StreamTypeSelectInput, {
						...attrs,
						excludeTypes: this.dfltExcludeTypes.concat([TypeIdentifier.Unspecified], attrs.excludeTypes || [])
					}));
			default:
				return this.renderInput(attrs);
		}

	}

	protected renderInput({type, onInput, label}: TypeSelectAttrs): m.Children {
		const selected = TypeIdentifier[type.getTypeIdentifier()];
		const fixed = false;

		if (!this.portTypeOptions.includes(selected)) {
			onInput(SlangType.new(toTypeIdentifier(this.portTypeOptions[0])));
		}

		return m(SelectInput, {
			label,
			selected,
			size: "small",
			options: (fixed) ? [selected] : this.portTypeOptions,
			onInput: (fixed) ? () => null :
				(opt: string) => {
					if (this.portTypeOptions.indexOf(opt) < 0) {
						return;
					}
					onInput(SlangType.new(toTypeIdentifier(opt)));
				},
		});
	}
}
