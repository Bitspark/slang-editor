import m, {ClassComponent, CVnode} from "mithril";

export interface HasSizeAttrs {
	size?: "small" | "medium" | "large";
}

export function buildCssClass(attrs: HasSizeAttrs, className?: string): string {
	const css: string[] = [className?className:""];
	if (attrs.size) {
		css.push("is-" + attrs.size!);
	}
	return css.join(" ");
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
		return m("h5.title.is-5", children);
	}
}

export class Subtitle implements ClassComponent<{}> {
	public view({children}: CVnode<{}>) {
		return m("h5.subtitle.is-5", children);
	}
}