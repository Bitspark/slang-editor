import m, {ClassComponent, CVnode} from "mithril";
import { buildCssClass, HasSizeAttrs } from ".";

import {MithrilMouseEvent} from "./events";
import {Icon, IconAttrs} from "./icons";

interface ButtonAttrs extends HasSizeAttrs {
	class?: string;
	tooltip?: string;
	notAllowed?: boolean;
	inactive?: boolean;
	full?: boolean;
	type?: "button" | "submit" | "reset";
	color?: "white" | "light" | "dark" | "black" | "text" | "ghost" |
		   "primary" | "link" | "info" | "success" | "warning" | "danger"

	// deprecated
	onClick?(e: MithrilMouseEvent): void;
	onclick?(e: MithrilMouseEvent): void;
}

function buttonColorCssClass(attrs: ButtonAttrs): string {
	if (!attrs.color) {
		return ""
	}
	return "is-" + attrs.color
}

export class Button implements ClassComponent<ButtonAttrs> {
	private alreadyClicked: boolean = false;
	private bounceInterval = 500;

	public oninit() {
		return;
	}

	public view({attrs, children}: CVnode<ButtonAttrs>) {
		const that = this;
		
		if (attrs.onClick) {
			attrs.onclick = attrs.onClick
		}

		return m("button.button", {
			class: buildCssClass(attrs, buttonColorCssClass(attrs)),
			inacitve: that.isInactive(attrs),
			onclick: (that.isClickable(attrs)) ? (e: MithrilMouseEvent) => {
				if (that.alreadyClicked) {
					return;
				}
				that.alreadyClicked = true;
				attrs.onclick!(e);
				setTimeout(() => {
					that.alreadyClicked = false;
				}, that.bounceInterval);
			} : undefined,
			title: attrs.tooltip,
			type: attrs.type,
		}, children);
	}

	private isClickable(attrs: ButtonAttrs): boolean {
		return !!attrs.onclick && !attrs.notAllowed;
	}

	private isInactive(attrs: ButtonAttrs): boolean {
		return !!attrs.notAllowed && !!attrs.inactive;
	}
}

export class IconButton implements ClassComponent<ButtonAttrs & IconAttrs> {
	public view({attrs, children}: CVnode<ButtonAttrs & IconAttrs>) {
		return m(Button, attrs, m(Icon, attrs), children);
	}
}
