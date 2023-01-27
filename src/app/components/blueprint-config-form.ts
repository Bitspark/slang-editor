import m, {ClassComponent, CVnode} from "mithril";
import {Block, Box, Title} from "../../slang/ui/toolkit";
import {MapEntriesInput, TypeSelect} from "../../slang/ui/toolkit/type";
import {SlangType} from "../../slang/definitions/type";
import {BlueprintFakeGeneric} from "../../slang/core/models/blueprint";
import {AppState} from "../state";
import {PropertyModel} from "../../slang/core/abstract/utils/properties";

export class BlueprintConfigForm implements ClassComponent<any> {
	// @ts-ignore
	public view({attrs}: CVnode<any>) {
		const blueprint = AppState.currentBlueprint;

		return m(Box, {class: "sle-comp__blueprint-config-form"},
			m(BlueprintPropertiesConfig, {
				properties: blueprint.getProperties(),
				oninput: (newProps: Iterable<PropertyModel>) => {
					blueprint.updateProperties(newProps);
				},
			}),
			m(Block,
				m(Title, "In port"),
				m(TypeSelect, {
					type: blueprint.getPortIn()?.getType()!,
					onInput: (nType: SlangType) => {
						blueprint.getGenerics().specify(BlueprintFakeGeneric.In, nType);
					},
				}),
				m(Title, "Out port"),
				m(TypeSelect, {
					type: blueprint.getPortOut()?.getType()!,
					onInput: (nType: SlangType) => {
						blueprint.getGenerics().specify(BlueprintFakeGeneric.Out, nType);
					},
				}),
			),
		);
	}
}

interface BlueprintPropertiesAttrs {
	properties: Iterable<PropertyModel>;
	oninput(properties: Iterable<PropertyModel>): void;
}

class BlueprintPropertiesConfig implements ClassComponent<BlueprintPropertiesAttrs> {
	private properties: Array<[string, SlangType]> = [];

	public oninit({attrs}: CVnode<BlueprintPropertiesAttrs>) {
		this.properties = Array.from(attrs.properties).map((prop) => [prop.getName(), prop.getType()]);
	}

	public view({attrs}: CVnode<BlueprintPropertiesAttrs>): any {
		const that = this;
		return m(Block,
			m(Title, "Properties"),
			m(MapEntriesInput, {
				entries: this.properties,

				onremoveEntry(idx: number) {
					that.properties.splice(idx, 1);
					attrs.oninput(that.toProperties(that.properties));
				},

				onappendEntry(entry: [string, SlangType]) {
					that.properties.push(entry);
					attrs.oninput(that.toProperties(that.properties));
				},

				oneditEntry(idx: number, entry: [string, SlangType]) {
					that.properties[idx] = entry;
					attrs.oninput(that.toProperties(that.properties));
				},
			}),
		);
	}

	private toProperties(props: Array<[string, SlangType]>): Iterable<PropertyModel> {
		return props.map(([name, type]) => new PropertyModel(name, type));
	}
}
