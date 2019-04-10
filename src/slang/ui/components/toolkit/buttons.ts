import m, {ClassComponent, CVnode} from "mithril";

import {MithrilMouseEvent} from "./events";
import {buildCssClass, HasSizeAttrs} from "./toolkit";

interface ButtonAttrs extends HasSizeAttrs {
	tooltip?: string;
	notAllowed?: boolean;
	inactive?: boolean;
	full?: boolean;
	type?: "button" | "submit" | "reset";

	onClick?(e: MithrilMouseEvent): void;
}

export class Button implements ClassComponent<ButtonAttrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	public oninit() {
		return;
	}

	public view({attrs, children}: CVnode<ButtonAttrs>) {
		const that = this;

		return m("a.button", {
			class: buildCssClass(attrs),
			inacitve: that.isInactive(attrs),
			onclick: (that.isClickable(attrs)) ? (e: MithrilMouseEvent) => {
				if (that.alreadyClicked) {
					return;
				}
				that.alreadyClicked = true;
				attrs.onClick!(e);
				setTimeout(() => {
					that.alreadyClicked = false;
				}, that.bounceInterval);
			} : undefined,
			tooltip: attrs.tooltip,
			type: attrs.type,
		}, children);
	}

	private isClickable(attrs: ButtonAttrs): boolean {
		return !!attrs.onClick && !attrs.notAllowed;
	}

	private isInactive(attrs: ButtonAttrs): boolean {
		return !!attrs.notAllowed && !!attrs.inactive;
	}
}
