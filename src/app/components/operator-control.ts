import m, {ClassComponent, CVnode} from "mithril";

import {OperatorModel} from "../../slang/core/models";
import {PaperView} from "../../slang/ui/views/paper-view";

import {IconButton} from "../../slang/ui/toolkit/buttons";
import {Box} from "../../slang/ui/toolkit";
interface OperatorControlAttrs {
	view: PaperView;
	operator: OperatorModel;

	onclose(): void;
	onconfig(): void;
}

export class OperatorControl implements ClassComponent<OperatorControlAttrs> {
	public view({attrs}: CVnode<OperatorControlAttrs>): any {
		const opr = attrs.operator;
		const bp = opr.getBlueprint();
		const v = attrs.view;

		return m(".sle-comp-opr-ctrl",
			m(Box,
				m(".buttons", [
					v.isEditable ?
						m(IconButton, {
							size: "small",
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
							size: "small",
							fas: "project-diagram",
							tooltip: "Open blueprint",
							onClick: () => m.route.set("/edit/:uuid", {uuid: bp.uuid})
						})
						: undefined,

					bp.hasProperties() ?
						m(IconButton, {
							size: "small",
							fas: "wrench",
							tooltip: "Configure operator",
							onClick: () => {
								attrs.onclose();
								attrs.onconfig();
							} 
						})
						: undefined,
				]),
			),
		);
	}
}