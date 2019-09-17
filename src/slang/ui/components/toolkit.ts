import m, {ClassComponent, CVnode} from "mithril";

export class Container implements ClassComponent<any> {
	public view({children, attrs}: CVnode<any>) {
		return m("", attrs, children);
	}
}
