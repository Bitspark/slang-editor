import m, {Children, ClassComponent, CVnode} from "mithril";
import {SlangType, TypeIdentifier} from "../../../custom/type";
import {FormInput} from "./form-input";


export namespace Form {
	export interface Attrs {
		type: SlangType
		//onSelect: (bp: BlueprintModel) => void,
		//onHover: (bp?: BlueprintModel) => void,
		//onFilter: (filter: string) => void,
		//onLoad: () => Array<BlueprintModel>
	}
}

export class Form implements ClassComponent<Form.Attrs> {
	protected type: SlangType | undefined;

	oninit({attrs}: CVnode<Form.Attrs>) {
		this.type = attrs.type;
	}

	view({attrs}: CVnode<Form.Attrs>): Children {
		return m("form.sl-form", m(FormGroup, {type: this.type!}));
	}
}

export class FormGroup implements ClassComponent<Form.Attrs> {
	protected type: SlangType | undefined;

	oninit({attrs}: CVnode<Form.Attrs>) {
		this.type = attrs.type;
	}

	view({attrs}: CVnode<Form.Attrs>): Children | null {
		if (!this.type) return m(".sl-inp.undef");
		const t = this.type;
		switch (this.type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				return m(".sl-inp-grp.map", Array.from(t.getMapSubs())
					.map(([subName, subType]) => m(Form, {
							type: subType
						})
					)
				);

			case TypeIdentifier.Stream:
				return m(".sl-inp-grp.strm",
					m(Form, {type: t.getStreamSub()})
				);

			case TypeIdentifier.Number:
				return m(FormInput.Number);

			case TypeIdentifier.Boolean:
				return m(FormInput.Boolean);

			case TypeIdentifier.Trigger:
				return m(FormInput.Trigger);

			default:
				return m(FormInput.Text);
		}
	}
}
