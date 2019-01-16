import m, {ClassComponent, CVnode} from "mithril";
import {OperatorModel} from "../../model/operator";
import {MithrilMouseEvent, Tk} from "./toolkit";
import {Input} from "./console";
import {PropertyAssignment, PropertyAssignments, PropertyModel} from "../../model/property";
import {BlueprintModel} from "../../model/blueprint";
import {SlangTypeValue} from "../../custom/type";


interface PropertyFormAttrs {
	operator: OperatorModel
	onSubmit: (propertyAssignments: PropertyAssignments) => void
}

export class PropertyForm implements ClassComponent<PropertyFormAttrs> {
	private propAssigns!: PropertyAssignments;
	private blueprint!: BlueprintModel;
	private operator!: OperatorModel;

	oninit({attrs}: CVnode<PropertyFormAttrs>): any {
		this.operator = attrs.operator;
		this.blueprint = this.operator.getBlueprint();
		this.propAssigns = attrs.operator.getPropertyAssignments();
	}

	private isValid(): boolean {
		return true;
	}

	private renderPropertyInput(operator: OperatorModel, assignment: PropertyAssignment): m.Children {
		const type = assignment.getType();
		const propName = assignment.getName();
		return m(Input.ConsoleEntry, {
			label: propName, class: "",
			type: type!,
			initValue: assignment.getValue(),
			onInput: (v: SlangTypeValue) => {
				assignment.assign(v);
				this.propAssigns.get(propName).assign(v);
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
			Array.from(operator.getPropertyAssignments().getAssignments())
				.filter(assignment => !!assignment.getType())
				.map(assignment => this.renderPropertyInput(operator, assignment)),
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

