import m, {ClassComponent, CVnode} from "mithril";
import {OperatorModel} from "../../model/operator";
import {Tk} from "./toolkit";
import {Input} from "./console";
import {PropertyAssignments} from "../../model/property";
import {BlueprintModel} from "../../model/blueprint";
import {isUndefined, SlangType, SlangTypeValue} from "../../custom/type";
import {componentFactory} from "./factory";


interface DashboardAttrs {
	operator: OperatorModel
	onSave: () => void
}

export class DashboardComponent implements ClassComponent<DashboardAttrs> {
	view({attrs}: CVnode<DashboardAttrs>): any {
		const dashboardModules = componentFactory.getDashboardModules(attrs.operator);
		return m("div.sl-operator-dashboard", dashboardModules.map((dashboardModule) => {
			return m(dashboardModule, {
				operator: attrs.operator,
				onSave: () => {
					attrs.onSave();
				}
			})
		}));
	}
}

export interface DashboardModuleAttrs {
	operator: OperatorModel
	onSave: () => void
}

export interface DashboardModuleComponent extends ClassComponent<DashboardModuleAttrs> {
}

export class PropertyFormDashboardModuleComponent implements DashboardModuleComponent {
	private blueprint!: BlueprintModel;
	private operator!: OperatorModel;
	private formBody = new Map<string, { initValue?: SlangTypeValue, type: SlangType }>();
	private formData = new Map<string, { value: SlangTypeValue }>();

	oninit({attrs}: CVnode<DashboardModuleAttrs>): any {
		this.operator = attrs.operator;
		this.blueprint = this.operator.getBlueprint();
		this.formBody = this.getFormBody();
		this.formData = new Map<string, { value: SlangTypeValue }>();
	}

	protected isValid(_formData: Map<string, { value: SlangTypeValue }>): boolean {
		return true;
	}

	protected getFormBody(): Map<string, { initValue?: SlangTypeValue, type: SlangType }> {
		const op = this.operator!;
		const propAssigns = op.getPropertyAssignments();
		return Array.from(propAssigns.getAssignments()).reduce((m, propAssign) => {
			const type = propAssign.getType();
			if (!type) {
				return m;
			}
			const initValue = propAssign.getValue();
			return m.set(propAssign.getName(), !isUndefined(initValue) ? {initValue, type} : {type});
		}, new Map<string, { initValue?: SlangTypeValue, type: SlangType }>());
	}

	protected beforeFormSubmit(formData: Map<string, { value: SlangTypeValue }>): Map<string, { value: SlangTypeValue }> {
		return formData;
	}

	private getFormSubmitData(formData: Map<string, { value: SlangTypeValue }>): PropertyAssignments {
		const op = this.operator!;
		const propAssigns = op.getPropertyAssignments();
		formData.forEach((value, propertyName) => {
			propAssigns.get(propertyName).assign(value);
		});
		return propAssigns
	}

	private renderPropertyInput(fieldName: string, _fieldAttrs: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
		const {type, initValue} = this.formBody.get(fieldName)!;
		return m(Input.ConsoleEntry, {
			label: fieldName, class: "",
			type: type,
			initValue: !this.formData.has(fieldName) ? initValue : undefined,
			onInput: (v: any) => {
				this.formData.set(fieldName, v);
			}
		});
	}

	view({attrs}: CVnode<DashboardModuleAttrs>): any {
		const blueprint = this.blueprint!;

		return m("form.sl-property.sl-console-in", {
				class: (this.isValid(this.formData) ? "sl-invalid" : "")
			},
			m("h4", `Properties of "${blueprint.getShortName()}"`),
			Array.from(this.formBody.entries()).map(([fieldName, fieldAttrs]) => {
				return this.renderPropertyInput(fieldName, fieldAttrs);
			}),
			m(Tk.Button, {
					full: true,
					notAllowed: !this.isValid(this.formData),
					onClick: this.isValid ? () => {
						this.operator.setPropertyAssignments(this.getFormSubmitData(this.beforeFormSubmit(this.formData)));
						attrs.onSave();
					} : undefined
				}, "save & close"
			)
		);
	}
}
