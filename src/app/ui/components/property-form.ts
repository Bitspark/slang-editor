import m, {ClassComponent, CVnode} from "mithril";
import {OperatorModel} from "../../model/operator";
import {MithrilMouseEvent, Tk} from "./toolkit";
import {Input} from "./console";
import {PropertyAssignments, PropertyModel} from "../../model/property";
import {BlueprintModel} from "../../model/blueprint";


interface PropertyFormAttrs {
	operator: OperatorModel
	onSubmit: (propertyAssignments: PropertyAssignments) => void
}

export class PropertyForm implements ClassComponent<PropertyFormAttrs> {
	private propAssigns: PropertyAssignments | undefined;
	private blueprint: BlueprintModel | undefined;
	private operator: OperatorModel | undefined;

	oninit({attrs}: CVnode<PropertyFormAttrs>): any {
		this.operator = attrs.operator;
		this.blueprint = this.operator.getBlueprint();
		this.propAssigns = attrs.operator.getPropertyAssignments();
	}

	private isValid(): boolean {
		return true;
	}

	private renderPropertyInput(operator: OperatorModel, property: PropertyModel): m.Children {
		const type = property.getType();
		const propName = property.getName();
		return m(Input.ConsoleEntry, {
			label: propName, class: "",
			type: type!,
			initValue: this.propAssigns!.has(propName) ? this.propAssigns!.get(property).getValue() : undefined,
			onInput: (v: any) => {
				this.propAssigns!.assign(propName, v);
			}
		});
	}

	view({attrs}: CVnode<PropertyFormAttrs>): any {
		const operator = this.operator!;
		const blueprint = this.blueprint!;

		return m("form.sl-property.sl-console-in", {
				class: (this.isValid() ? "sl-invalid" : "")
			},
			m("h4", `Properties of "${blueprint.getShortName()}"`),
			Array.from(blueprint.getProperties()).map((property) => {
				return this.renderPropertyInput(operator, property);
			}),
			m(Tk.Button, {
					full: true,
					notAllowed: !this.isValid(),
					onClick: this.isValid ? (e: MithrilMouseEvent) => {
						attrs.onSubmit(this.propAssigns!);
					} : undefined
				}, "Save"
			)
		);
	}
}

