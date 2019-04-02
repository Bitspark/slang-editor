import m, {ClassComponent, CVnode} from "mithril";

import {BlueprintModel} from "../../core/models/blueprint";
import {OperatorModel} from "../../core/models/operator";
import {isUndefined, SlangType, SlangTypeValue} from "../../definitions/type";
import {ComponentFactory} from "../factory";

import {Input} from "./console";
import {Form} from "./toolkit";

interface DashboardAttrs {
	factory: ComponentFactory;
	operator: OperatorModel;

	onSave(): void;
}

export class DashboardComponent implements ClassComponent<DashboardAttrs> {
	public view({attrs}: CVnode<DashboardAttrs>): any {
		const dashboardModules = attrs.factory.getDashboardModules(attrs.operator);
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

	onSave(): void;
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

		return m(Form, {
				isValid: this.isValid(this.formData),
				submitLabel: "save&close",
				onsubmit: () => {
					this.beforeFormSubmit(this.formData).forEach((value, propertyName) => {
						this.operator.getProperties().get(propertyName).assign(value);
					});
					attrs.onSave();
				},
			},
			m("h4", `Properties of "${blueprint.getShortName()}"`),
			Array.from(this.formBody.entries()).map(([fieldName, fieldAttrs]) => {
				return this.renderPropertyInput(fieldName, fieldAttrs);
			}),
		);
	}

	protected isValid(_formData: Map<string, { value: SlangTypeValue }>): boolean {
		return true;
	}

	protected getFormBody(): Map<string, { initValue?: SlangTypeValue, type: SlangType }> {
		const op = this.operator!;
		const propAssigns = op.getProperties();
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

	private renderPropertyInput(fieldName: string, {type, initValue}: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
		return m(Input.ConsoleEntry, {
			type,
			label: fieldName,
			class: "",
			initValue: !this.formData.has(fieldName) ? initValue : undefined,
			onInput: (v: any) => {
				this.formData.set(fieldName, v);
			},
		});
	}
}
