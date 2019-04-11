import m, {ClassComponent, CVnode} from "mithril";

import {Keypress, MithrilKeyboardEvent, MithrilMouseEvent} from "./events";

export interface HasSizeAttrs {
	size?: "small" | "medium" | "large";
}

interface HasEscapeAttrs {
	onescape?(): void;
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

export class Box implements ClassComponent<HasEscapeAttrs> {

	public oninit({attrs}: CVnode<HasEscapeAttrs>) {
		const onescape = attrs.onescape;
		if (!onescape) {
			return;
		}

		document.addEventListener("keyup", (event: Event) => {
			const e = event as MithrilKeyboardEvent;
			if (e.key === "Escape") {
				e.redraw = false;
				onescape();
			}
		});
	}

	public view({attrs, children}: CVnode<HasEscapeAttrs>) {
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
