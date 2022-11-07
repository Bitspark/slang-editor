import m, {ClassComponent, CVnode} from "mithril";
import {IconButton} from "../../slang/ui/toolkit/buttons";
interface OperatorControlAttrs {
	ondelete?(): void;
	onopen?(): void;
	onconfig?(): void;
}

export class OperatorControl implements ClassComponent<OperatorControlAttrs> {
	public view({attrs}: CVnode<OperatorControlAttrs>): any {

		return m(".sle-comp__opr-ctrl",
			m(".buttons.are-normal", [
				attrs.ondelete
				? m(IconButton, {
					color: "black",
					fas: "trash-alt",
					tooltip: "Remove operator",
					onclick: attrs.ondelete
				})
				: undefined,

				attrs.onopen
				? m(IconButton, {
					color: "black",
					fas: "project-diagram",
					tooltip: "Open blueprint",
					onclick: attrs.onopen
				})
				: undefined,

				attrs.onconfig
				? m(IconButton, {
					color: "black",
					fas: "wrench",
					tooltip: "Configure operator",
					onclick: attrs.onconfig
				})
				: undefined,
			]),
		);
	}
}