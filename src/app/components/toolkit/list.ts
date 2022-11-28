import m, {ClassComponent, CVnode} from "mithril";

export class List implements ClassComponent<any> {
	public view({attrs, children}: CVnode<any>) {
        return m(".panel", attrs, children)
    }
}
export class ListHeading implements ClassComponent<any> {
    public view({attrs, children}: CVnode<any>) {
        return m(".panel-heading", attrs, children);
    }
}
export class ListEntry implements ClassComponent<any> {
    public view({attrs, children}: CVnode<any>) {
        return m(".panel-block", attrs, children);
    }
}
