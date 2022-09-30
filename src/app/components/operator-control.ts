import m, {ClassComponent, CVnode} from "mithril";
import {IconButton} from "../../slang/ui/toolkit/buttons";
interface OperatorControlAttrs {
	ondelete?(): void;
	onopen?(): void;
	onconfig?(): void;
}

export class OperatorControl implements ClassComponent<OperatorControlAttrs> {
	public view({attrs}: CVnode<OperatorControlAttrs>): any {

		return m(".sle-comp-opr-ctrl",
			m(".buttons", [
				attrs.ondelete
				? m(IconButton, {
					size: "small",
					fas: "trash-alt",
					tooltip: "Remove operator",
					onClick: attrs.ondelete
				})
				: undefined,

				attrs.onopen
				? m(IconButton, {
					size: "small",
					fas: "project-diagram",
					tooltip: "Open blueprint",
					onClick: attrs.onopen
				})
				: undefined,

				attrs.onconfig
				? m(IconButton, {
					size: "small",
					fas: "wrench",
					tooltip: "Configure operator",
					onClick: attrs.onconfig
				})
				: undefined,
			]),
		);
	}
}