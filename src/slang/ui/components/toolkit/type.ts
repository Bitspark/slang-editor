import m, {ClassComponent, CVnode} from "mithril";

import {toTypeIdentifier} from "../../../core/mapper";
import {SlangType, TYPEID_NAMES, TypeIdentifier} from "../../../definitions/type";

import {Block, Tk} from "./toolkit";
import SelectInput = Tk.SelectInput;
import StringInput = Tk.StringInput;

interface EditableListAttrs {
	entries: Array<[string, SlangType]>;

	onremoveEntry(idx: number): void;

	onappendEntry(entry: [string, SlangType]): void;

	oneditEntry(idx: number, entry: [string, SlangType]): void;
}

export class EditableList implements ClassComponent<EditableListAttrs> {
	public view({attrs}: CVnode<EditableListAttrs>) {
		return m("",
			m("", [
				attrs.entries.map(([tname, type], index: number) => {
					return m("", [
						m(StringInput, {
							label: "",
							initValue: tname,
							onInput(ntname: string) {
								attrs.oneditEntry(index, [ntname, type]);
							},
						}),
						m(TypeSelect, {
							type,
							label: "",
							onInput: (ntype: SlangType) => {
								attrs.oneditEntry(index, [tname, ntype]);
							},
						}),
						m(Tk.Button, {
							onClick: () => {
								attrs.onremoveEntry(index);
							},
							class: "sl-remove-entry sl-red",
						}, m("i.fas.fa-times")),
					]);
				}),
				m("", m(Tk.Button, {
					onClick: () => {
						attrs.onappendEntry(["", SlangType.newUnspecified()]);
					},
					class: "sl-add-entry",
				}, m("i.fas.fa-plus"))),
			]),
		);
	}
}

interface TypeSelectAttrs extends Tk.InputAttrs<SlangType> {
	type: SlangType;
}

export class MapTypeSelectInput implements ClassComponent<TypeSelectAttrs> {
	public view({attrs}: CVnode<TypeSelectAttrs>) {
		const that = this;
		const mapEntries = Array.from(attrs.type.getMapSubs());
		return m(EditableList, {
			entries: mapEntries,

			onremoveEntry(idx: number) {
				mapEntries.splice(idx, 1);
				attrs.onInput(that.getMapSlangType(mapEntries));
			},

			onappendEntry(entry: [string, SlangType]) {
				mapEntries.push(entry);
				attrs.onInput(that.getMapSlangType(mapEntries));
			},

			oneditEntry(idx: number, entry: [string, SlangType]) {
				mapEntries[idx] = entry;
				attrs.onInput(that.getMapSlangType(mapEntries));
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
			label: "",
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

	public oninit(): any {
		this.portTypeOptions = TYPEID_NAMES;
	}

	public view({attrs}: CVnode<TypeSelectAttrs>): m.Children {
		const t = attrs.type;
		const ti = t.getTypeIdentifier();

		switch (ti) {
			case TypeIdentifier.Map:
				return m(Block,
					this.renderInput(attrs.label, t, attrs.onInput),
					m(MapTypeSelectInput, {
						label: "",
						type: t,
						onInput: attrs.onInput,
					}));

			case TypeIdentifier.Stream:
				return m(Block,
					this.renderInput(attrs.label, t, attrs.onInput),
					m(StreamTypeSelectInput, {
						label: "",
						type: t,
						onInput: attrs.onInput,
					}));
			default:
				return this.renderInput(attrs.label, t, attrs.onInput);
		}

	}

	protected renderInput(label: string, type: SlangType, oninput: (t: SlangType) => void): m.Children {
		const ti = TypeIdentifier[type.getTypeIdentifier()];
		const fixed = false;

		return m(SelectInput, {
			label,
			class: "",
			selected: ti,
			options: (fixed) ? [ti] : this.portTypeOptions,
			onInput: (fixed) ? () => null :
				(opt: string) => {
					if (this.portTypeOptions.indexOf(opt) < 0) {
						return;
					}
					oninput(SlangType.new(toTypeIdentifier(opt)));
				},
		});
	}
}
