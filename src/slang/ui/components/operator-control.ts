import m, {ClassComponent, CVnode} from "mithril";

import {OperatorModel} from "../../core/models/operator";
import {PaperView} from "../views/paper-view";

import {DashboardComponent} from "./dashboard";
import {IconButton} from "./toolkit/buttons";
import {Box} from "./toolkit/toolkit";

interface OperatorMenuAttrs {
	view: PaperView;
	operator: OperatorModel;

	onclose(): void;
}

export class OperatorControl implements ClassComponent<OperatorMenuAttrs> {
	public view({attrs}: CVnode<OperatorMenuAttrs>): any {
		const opr = attrs.operator;
		const bp = opr.getBlueprint();
		const v = attrs.view;

		return m(".sl-opr-ctrl",
			m(Box,
				m(".buttons", [
					v.isEditable ?
						m(IconButton, {
							fas: "trash-alt",
							tooltip: "Remove operator",
							onClick: () => {
								attrs.onclose();
								opr.destroy();
							},
						})
						: undefined,

					v.isDescendable && !bp.isElementary() ?
						m(IconButton, {
							fas: "project-diagram",
							tooltip: "Open blueprint",
							onClick: () => {
								bp.open();
							},
						})
						: undefined,
				]),
			),
			m(Box, m(DashboardComponent, attrs)),
		);
	}
}
