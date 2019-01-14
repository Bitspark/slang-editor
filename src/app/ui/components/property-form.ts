import m, {ClassComponent, CVnode} from "mithril";
import {OperatorModel} from "../../model/operator";
import {MithrilMouseEvent, Tk} from "./toolkit";
import {SlangTypeValue} from "../../custom/type";
import {Input} from "./console";
import {PropertyModel} from "../../model/property";


interface PropertyFormAttrs {
	operator: OperatorModel
}

export class PropertyForm implements ClassComponent<PropertyFormAttrs> {
	private value: SlangTypeValue | undefined;

	private isValid(): boolean {
		return true;
	}

	private renderPropertyInput(operator: OperatorModel, property: PropertyModel): m.Children {
		const type = property.getType();
		return m(Input.ConsoleEntry, {
			label: "", class: "",
			type: type!,
			onInput: (v: any) => {
				this.value = v;
			}
		});
	}

	view({attrs}: CVnode<PropertyFormAttrs>): any {
		const that = this;
		const operator = attrs.operator;
		const blueprint = operator.getBlueprint();
		blueprint.getProperties();

		return m("form.sl-property", {
				class: (that.isValid() ? "sl-invalid" : "")
			},
			Array.from(blueprint.getProperties()).map((property) => {
				return that.renderPropertyInput(operator, property);
			}),
			m(Tk.Button, {
					full: true,
					notAllowed: !that.isValid(),
					onClick: that.isValid ? (e: MithrilMouseEvent) => {
						console.log(">>>>", that.value);
					} : undefined
				}, "Push"
			)
		);
	}
}
