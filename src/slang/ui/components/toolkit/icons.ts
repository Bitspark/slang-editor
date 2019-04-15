import m, {ClassComponent, CVnode} from "mithril";

import {buildCssClass, HasSizeAttrs} from "./toolkit";

export interface IconAttrs extends HasSizeAttrs {
	fas: string;
}

export class Icon implements ClassComponent<IconAttrs> {
	public view({attrs}: CVnode<IconAttrs>) {
		return m(".span.icon", {class: buildCssClass(attrs)}, m(`.fas.fa-${attrs.fas}`));
	}
}
