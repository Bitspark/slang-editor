import m, {ClassComponent, CVnode} from "mithril";
import {Box} from "../../slang/ui/toolkit";
import {TypeSelect} from "../../slang/ui/toolkit/type";
import {SlangType} from "../../slang/definitions/type";
import {BlueprintFakeGeneric} from "../../slang/core/models/blueprint";
import {AppState} from "../state";


export class BlueprintConfigForm implements ClassComponent<any> {
	// @ts-ignore
	public view({attrs}: CVnode<any>) {
		const blueprint = AppState.currentBlueprint;


		return m(Box, {class: "sle-comp__blueprint-config-form"},
			m(TypeSelect, {
				label: "In port",
				type: blueprint.getPortIn()?.getType()!,
				onInput: (nType: SlangType) => {
					blueprint.getGenerics().specify(BlueprintFakeGeneric.In, nType);
				},
			}),
			m(TypeSelect, {
				label: "Out port",
				type: blueprint.getPortOut()?.getType()!,
				onInput: (nType: SlangType) => {
					blueprint.getGenerics().specify(BlueprintFakeGeneric.Out, nType);
				},
			}),
		);
	}
}
