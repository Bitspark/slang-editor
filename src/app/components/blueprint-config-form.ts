import m, {ClassComponent, CVnode} from "mithril";
import {Block, Box, Subtitle, Title} from "../../slang/ui/toolkit";
import {MapTypeSelectInput, TypeSelect} from "../../slang/ui/toolkit/type";
import {SlangType} from "../../slang/definitions/type";
import {BlueprintFakeGeneric} from "../../slang/core/models/blueprint";
import {AppState} from "../state";


export class BlueprintConfigForm implements ClassComponent<any> {
	// @ts-ignore
	public view({attrs}: CVnode<any>) {
		const blueprint = AppState.currentBlueprint;


		return m(Box, {class: "sle-comp__blueprint-config-form"},
			m(Block,
				m(Title, "Properties"),
				m(MapTypeSelectInput, {
					type: SlangType.newMap(),
					onInput: (nType: SlangType) => {
						// @TODO, update blueprint properties
					},
				}),
			),
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
			)
		);
	}
}
