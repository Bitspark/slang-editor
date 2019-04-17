import m, {ClassComponent, CVnode} from "mithril";

import {Keypress, MithrilKeyboardEvent, MithrilMouseEvent} from "./events";

export interface HasSizeAttrs {
	size?: "small" | "medium" | "large";
}

interface HasCloseAttrs {
	onclose?(): void;
}

export function buildCssClass(attrs: HasSizeAttrs): string {
	const css: string[] = [];
	css.push("is-" + (attrs.size ? attrs.size! : "medium"));
	return css.join(".");
}

export class Container implements ClassComponent<any> {
	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}

export class Floater implements ClassComponent<HasCloseAttrs> {

	/*
	public oncreate({attrs, dom}: CVnodeDOM<HasCloseAttrs>) {
		const onclose = attrs.onclose;
		if (!onclose) {
			return;
		}

		const hndlKeyup = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}
			document.removeEventListener("click", hndlClickOutside);
			document.removeEventListener("keyup", hndlKeyup);
			onclose();
		};

		// a click opening a Floater element will also be handled by follwing click handle
		// even when following click handle should only be executed after Floater element is already displayed.
		// ==> ignore first click
		let firstClick = true;
		const hndlClickOutside = (event: Event) => {
			if (firstClick) {
				firstClick = false;
				return;
			}

			if (event.composedPath().indexOf(dom as HTMLElement) > 0) {
				return;
			}

			// click happend outside Box element
			document.removeEventListener("click", hndlClickOutside);
			document.removeEventListener("keyup", hndlKeyup);
			onclose();
		};

		document.addEventListener("click", hndlClickOutside);
		document.addEventListener("keyup", hndlKeyup);
	}
	*/

	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}

export class Box implements ClassComponent<any> {
	public view({attrs, children}: CVnode<any>) {
		return m(".box", attrs, children);
	}
}

export class InputGroup implements ClassComponent<any> {
	public view({attrs, children}: CVnode<any>) {
		return m(".sl-input-grp", attrs, children);
	}
}

export class Block implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("", children);
	}
}

export class Title implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("h5", children);
	}
}

export namespace Tk {

	interface ListAttrs {
		class?: string;
		onKey?: {
			[keyevent in keyof Keypress]: (e: MithrilKeyboardEvent) => void
		};

		onMouseEnter?(e: MithrilMouseEvent): void;

		onMouseLeave?(e: MithrilMouseEvent): void;
	}

	export class List implements ClassComponent<ListAttrs> {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListAttrs>) {
			return m("ul.sl-list", {
				class: attrs.class,
			}, children);
		}
	}

	interface ListItemAttrs {
		class?: string;

		onMouseEnter?(e: MithrilMouseEvent): void;

		onMouseLeave?(e: MithrilMouseEvent): void;

		onClick?(e: MithrilMouseEvent): void;
	}

	export class ListItem implements ClassComponent<ListItemAttrs> {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListItemAttrs>) {
			return m("li.sl-list-item", {
				class: attrs.class,
				onmouseenter: attrs.onMouseEnter,
				onmouseleave: attrs.onMouseLeave,
				onclick: attrs.onClick,
			}, children);
		}
	}

	export class ListHead extends ListItem {
		public oninit() {
			return;
		}

		public view({children, attrs}: CVnode<ListItemAttrs>) {
			return m("li.sl-list-head", {
				class: attrs.class,
				onmouseenter: attrs.onMouseEnter,
				onmouseleave: attrs.onMouseLeave,
				onclick: attrs.onClick,
			}, children);
		}
	}

}
