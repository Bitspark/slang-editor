import m, {ClassComponent, CVnode} from "mithril";

import {BlueprintModel, OperatorModel} from "../../slang/core/models";
import {SlangType, SlangTypeValue} from "../../slang/definitions/type";
import {PaperView} from "../../slang/ui/views/paper-view";

import {Input} from "./console";
import {Block, Box, Title} from "../../slang/ui/toolkit";

interface DashboardAttrs {
	view: PaperView;
	operator: OperatorModel;
}

export class OperatorDashboard implements ClassComponent<DashboardAttrs> {
    private readonly dashboardModules = [PropertyFormDashboardModule]

	public view({attrs}: CVnode<DashboardAttrs>): any {
		const view = attrs.view;

		if (view.isReadOnly) {
			return undefined;
		}

		const dashboardModules = this.dashboardModules
		return m(".sle-comp__opr-dashboard", {
			onmousewheel: (e: WheelEvent) => {
				e.stopPropagation();
			},
		}, m(Box,
			dashboardModules.map((dashboardModule: any) => {
				return m(dashboardModule, {
					operator: attrs.operator,
				});
			})
		));
	}
}

export interface DashboardModuleAttrs {
	operator: OperatorModel;
}

export interface DashboardModule extends ClassComponent<DashboardModuleAttrs> {
}

export class PropertyFormDashboardModule implements DashboardModule {
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

	public view(_: CVnode<DashboardModuleAttrs>): m.Children {
		const blueprint = this.blueprint!;

		if (!blueprint.hasProperties()) {
			return undefined;
		}

		return m(Block,
			m(Title, `Properties`),
			Array.from(this.formBody.entries()).map(([fieldName, fieldAttrs]) => {
				return this.renderPropertyInput(fieldName, fieldAttrs);
			}),
		);
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
			return map.set(propAssign.getName(), !SlangTypeValue.isUndefined(initValue) ? {initValue, type} : {type});
		}, new Map<string, { initValue?: SlangTypeValue, type: SlangType }>());
	}

	protected beforeFormSubmit(formData: Map<string, { value: SlangTypeValue }>): Map<string, { value: SlangTypeValue }> {
		return formData;
	}

	private renderPropertyInput(fieldName: string, {type, initValue}: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
		return m(Input.ConsoleEntry, {
			type,
			label: fieldName,
			initValue: !this.formData.has(fieldName) ? initValue : undefined,
			onInput: (v: any) => {
				this.formData.set(fieldName, v);
				this.beforeFormSubmit(this.formData).forEach((value, propertyName) => {
					this.operator.getProperties().get(propertyName).assign(value);
				});
			},
		});
	}
}
