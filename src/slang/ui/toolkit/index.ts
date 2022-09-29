import m, {ClassComponent, CVnode} from "mithril";

export interface HasSizeAttrs {
	size?: "small" | "medium" | "large";
}

export function buildCssClass(attrs: HasSizeAttrs): string {
	const css: string[] = [];
	css.push("is-" + (attrs.size ? attrs.size! : "medium"));
	return css.join(".");
}

export class Box implements ClassComponent<any> {
	public view({attrs, children}: CVnode<any>) {
		return m(".box", attrs, children);
	}
}

export class Block implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m(".block", children);
	}
}

export class Title implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("h5", children);
	}
}