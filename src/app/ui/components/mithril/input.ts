import m, {Children, ClassComponent, CVnode} from "mithril";

import {LandscapeModel} from "../../../model/landscape";
import {BlueprintModel} from "../../../model/blueprint";
import {BlueprintView} from "../../views/blueprint";
import {Geometry} from "../../../model/operator";
import {AnchorComponent, AnchorPosition} from "../anchor";
import {SlangType, TypeIdentifier} from "../../../custom/type";

export interface Attrs {
	type: SlangType
	//onSelect: (bp: BlueprintModel) => void,
	//onHover: (bp?: BlueprintModel) => void,
	//onFilter: (filter: string) => void,
	//onLoad: () => Array<BlueprintModel>
}

export interface MithrilMouseEvent extends MouseEvent {
	redraw: boolean
}


export class InputComponent implements ClassComponent<Attrs> {
	protected type: SlangType | undefined;

	oninit({attrs}: CVnode<Attrs>) {
		this.type = attrs.type;
	}

	view({attrs}: CVnode<Attrs>): Children | null {
		if (!this.type) return m(".sl-inp.undef");
		const t = this.type;
		switch (this.type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				return m(".sl-inp-grp.map", Array.from(t.getMapSubs())
					.map(([subName, subType]) => m(InputComponent, {
							type: subType
						})
					)
				);

			case TypeIdentifier.Stream:
				return m(".sl-inp-grp.strm",
					m(InputComponent, {type: t.getStreamSub()})
				);

			case TypeIdentifier.Number:
				return m(NumberInput);

			case TypeIdentifier.Boolean:
				return m(BooleanInput);

			case TypeIdentifier.Trigger:
				return m(TriggerInput);

			default:
				return m(TextInput);
		}
	}
}


interface InputAttrs {
	cssSelector: string,
	inputType: string
}

class BaseInput implements ClassComponent<InputAttrs> {
	constructor(protected readonly cssSelector: string, protected readonly inputType: string) {
	}

	view({attrs}: CVnode<InputAttrs>) {
		return m(this.cssSelector, {type: this.inputType});
	}
}

class TextInput extends BaseInput {
	constructor() {
		super("input.sl-inp.txt", "text");
	}
}

class NumberInput extends BaseInput {
	constructor() {
		super("input.sl-inp.num", "number");
	}
}

class BooleanInput extends BaseInput {
	constructor() {
		super("input.sl-inp.bool", "checkbox");
	}
}

class TriggerInput extends BaseInput {
	constructor() {
		super("input.sl-inp.trig", "button");
	}
}

