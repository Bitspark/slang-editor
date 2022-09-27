import m, {ClassComponent, CVnode} from "mithril";

interface HasCloseAttrs {
	onclose?(): void;
}

export class Container implements ClassComponent<any> {
	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}

export class Floater implements ClassComponent<HasCloseAttrs> {
	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}