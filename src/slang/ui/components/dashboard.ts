import m, {ClassComponent, CVnode} from "mithril";
import {isUndefined, SlangType, SlangTypeValue} from "../../custom/type";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PropertyAssignments} from "../../model/property";
import {Input} from "./console";
import {COMPONENT_FACTORY} from "./factory";
import {Tk} from "./toolkit";

interface DashboardAttrs {
	operator: OperatorModel;
	onSave: () => void;
}

export class DashboardComponent implements ClassComponent<DashboardAttrs> {
	public view({attrs}: CVnode<DashboardAttrs>): any {
		const dashboardModules = COMPONENT_FACTORY.getDashboardModules(attrs.operator);
		return m("div.sl-operator-dashboard", {
			onmousewheel: (e: WheelEvent) => {
				e.stopPropagation();
			},
		}, dashboardModules.map((dashboardModule) => {
			return m(dashboardModule, {
				operator: attrs.operator,
				onSave: () => {
					attrs.onSave();
				},
			});
		}));
	}
}

export interface DashboardModuleAttrs {
	operator: OperatorModel;
	onSave: () => void;
}

export interface DashboardModuleComponent extends ClassComponent<DashboardModuleAttrs> {
}

export class PropertyFormDashboardModuleComponent implements DashboardModuleComponent {
	private blueprint!: BlueprintModel;
	private operator!: OperatorModel;
	private formBody = new Map<string, { initValue?: SlangTypeValue, type: SlangType }>();
	private formData = new Map<string, { value: SlangTypeValue }>();

	public oninit({attrs}: CVnode<DashboardModuleAttrs>): any {
		this.operator = attrs.operator;
		this.blueprint = this.operator.getBlueprint();
		this.formBody = this.getFormBody();
		this.formData = new Map<string, { value: SlangTypeValue }>();
	}

	public view({attrs}: CVnode<DashboardModuleAttrs>): any {
		const blueprint = this.blueprint!;

		return m("form.sl-property.sl-console-in", {
				class: (this.isValid(this.formData) ? "sl-invalid" : ""),
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
					} : undefined,
				}, "save & close",
			),
		);
	}

	protected isValid(_formData: Map<string, { value: SlangTypeValue }>): boolean {
		return true;
	}

	protected getFormBody(): Map<string, { initValue?: SlangTypeValue, type: SlangType }> {
		const op = this.operator!;
		const propAssigns = op.getPropertyAssignments();
		return Array.from(propAssigns.getAssignments()).reduce((map, propAssign) => {
			const type = propAssign.getType();
			if (!type) {
				return map;
			}
			const initValue = propAssign.getValue();
			return map.set(propAssign.getName(), !isUndefined(initValue) ? {initValue, type} : {type});
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
		return propAssigns;
	}

	private renderPropertyInput(fieldName: string, _fieldAttrs: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
		const {type, initValue} = this.formBody.get(fieldName)!;
		return m(Input.ConsoleEntry, {
			label: fieldName, class: "",
			type,
			initValue: !this.formData.has(fieldName) ? initValue : undefined,
			onInput: (v: any) => {
				this.formData.set(fieldName, v);
			},
		});
	}
}
