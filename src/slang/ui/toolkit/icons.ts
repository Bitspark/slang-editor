import m, {ClassComponent, CVnode} from "mithril";

import {buildCssClass, HasSizeAttrs} from ".";

export interface IconAttrs extends HasSizeAttrs {
	fas: string;
}

export class Icon implements ClassComponent<IconAttrs> {
	// @ts-ignore
	public onupdate(vnode: m.VnodeDOM<IconAttrs, this>): any {
	}

	// @ts-ignore
	public onbeforeupdate(vnode: m.Vnode<IconAttrs, this>, old: m.VnodeDOM<IconAttrs, this>): boolean | void {
		const newAttrs = vnode.attrs
		const oldAttrs = old.attrs

		if (newAttrs.fas === oldAttrs.fas) {
			return
		}

		if (old.dom.firstElementChild) {
			old.dom.firstElementChild!.remove();
		}
	}

	public view({attrs}: CVnode<IconAttrs>) {
		//return m(".span.icon", {class: buildCssClass(attrs)}, m(`i.fas.fa-${attrs.fas}`));
		return m(".span.icon", {class: buildCssClass(attrs)}, m.trust(`<i class="fas fa-${attrs.fas}"></i>`));
	}
}
