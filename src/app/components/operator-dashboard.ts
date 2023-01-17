import m, {ClassComponent, CVnode} from "mithril";

import {OperatorModel} from "../../slang/core/models";
import {Canvas} from "../../slang/ui/canvas/base";

import {Block, Box} from "../../slang/ui/toolkit";
import {TextWithCopyButton} from "./toolkit/text-with-copy-button";
import {PropertiesForm} from "./toolkit/properties-form";
import {GenericsForm} from "./toolkit/generics-form";

interface DashboardAttrs {
	view: Canvas;
	operator: OperatorModel;
}

export class OperatorDashboard implements ClassComponent<DashboardAttrs> {
	public view({attrs}: CVnode<DashboardAttrs>): any {
		const view = attrs.view;
		const operator = attrs.operator;

		return m(".sle-comp__opr-dashboard", {
			onmousewheel: (e: WheelEvent) => {
				e.stopPropagation();
			},
		},
			m(Box,
				m(OperatorDetailsDashboardModule, {operator: attrs.operator})
			),

			view.isEditable
			? m(Box,
				operator.hasProperties() ? m(PropertiesForm, {properties: operator.getProperties()}) :undefined,
				operator.hasGenerics()? m(GenericsForm, {generics: operator.getGenerics()}) :undefined,
			)
			: undefined
		);
	}
}

export interface DashboardModuleAttrs {
	operator: OperatorModel;
}

export interface DashboardModule extends ClassComponent<DashboardModuleAttrs> {
}

export class OperatorDetailsDashboardModule implements DashboardModule {
	private operator!: OperatorModel;

	public oninit({attrs}: CVnode<DashboardModuleAttrs>): any {
		this.operator = attrs.operator;
	}

	public view(_: CVnode<DashboardModuleAttrs>): any {
		const op = this.operator;

		return m(Block, [
			m("p", m("strong", op.blueprint.name)),
			m("p", m(TextWithCopyButton, {class: "is-small ctrl-bar__uuid"}, op.blueprint.uuid)),
			m("p", op.blueprint.help)
		]);
	}
}