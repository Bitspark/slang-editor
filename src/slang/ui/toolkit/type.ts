import m, {ClassComponent, CVnode} from "mithril";

import {toTypeIdentifier} from "../../core/mapper";
import {SlangType, TYPEID_NAMES_NOGEN, TypeIdentifier} from "../../definitions/type";

import {IconButton} from "./buttons";
import {MithrilKeyboardEvent} from "./events";
import {BaseInputAttrs, SelectInput, StringInput} from "./input"
import {Block} from "./";

interface MapEntriesInputAttrs {
	entries: Array<[string, SlangType]>;

	onremoveEntry(idx: number): void;

	onappendEntry(entry: [string, SlangType]): void;

	oneditEntry(idx: number, entry: [string, SlangType]): void;
}

class MapEntriesInput implements ClassComponent<MapEntriesInputAttrs> {
	private static hasNameCollision(idx: number, ntname: string, entries: Array<[string, SlangType]>): boolean {
		return entries.filter((e: [string, SlangType], i) => i !== idx && e[0] === ntname).length > 0;
	}

	public view({attrs}: CVnode<MapEntriesInputAttrs>) {
		const entries = attrs.entries;

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
						oninput(ntname: string) {
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
						label: "",
						size: "small",
						oninput: (ntype: SlangType) => {
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

			onremoveEntry(idx: number) {
				that.mapEntries.splice(idx, 1);
				attrs.oninput(that.getMapSlangType(that.mapEntries));
			},

			onappendEntry(entry: [string, SlangType]) {
				that.mapEntries.push(entry);
				attrs.oninput(that.getMapSlangType(that.mapEntries));
			},

			oneditEntry(idx: number, entry: [string, SlangType]) {
				that.mapEntries[idx] = entry;
				attrs.oninput(that.getMapSlangType(that.mapEntries));
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
			oninput: (ntype: SlangType) => {
				attrs.oninput(that.getStreamSlangType(ntype));
			},
		});
	}

	private getStreamSlangType(streamSub: SlangType): SlangType {
		return SlangType.newStream().setStreamSub(streamSub);
	}
}

export class TypeSelect implements ClassComponent<TypeSelectAttrs> {
	private portTypeOptions!: string[];

	public oninit(): any {
		this.portTypeOptions = TYPEID_NAMES_NOGEN;
	}

	public view({attrs}: CVnode<TypeSelectAttrs>): m.Children {
		const t = attrs.type;
		const ti = t.getTypeIdentifier();

		switch (ti) {
			case TypeIdentifier.Map:
				return m(Block,
					this.renderInput(t, attrs.oninput, attrs.label),
					m(MapTypeSelectInput, {
						type: t,
						oninput: attrs.oninput,
					}));

			case TypeIdentifier.Stream:
				return m(".is-flex.is-flex-direction-row",
					this.renderInput(t, attrs.oninput, attrs.label),
					m(StreamTypeSelectInput, {
						type: t,
						oninput: attrs.oninput,
					}));
			default:
				return this.renderInput(t, attrs.oninput, attrs.label);
		}

	}

	protected renderInput(type: SlangType, oninput: (t: SlangType) => void, label?: string): m.Children {
		const ti = TypeIdentifier[type.getTypeIdentifier()];
		const fixed = false;

		return m(SelectInput, {
			label,
			size: "small", 
			selected: ti,
			options: (fixed) ? [ti] : this.portTypeOptions,
			oninput: (fixed) ? () => null :
				(opt: string) => {
					if (this.portTypeOptions.indexOf(opt) < 0) {
						return;
					}
					oninput(SlangType.new(toTypeIdentifier(opt)));
				},
		});
	}
}