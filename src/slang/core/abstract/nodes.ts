import {SlangNodeSetBehaviorSubject, SlangSubjectTrigger} from "./utils/events";

// tslint:disable-next-line
type Type<T> = Function & { prototype: T };

type Types<T> = [Type<T>, ...Array<Type<T>>] | Type<T>;

function getTypes<T>(types: Types<T>): [Type<T>, ...Array<Type<T>>] {
	if (types instanceof Array) {
		return types;
	}
	return [types];
}

export abstract class SlangNode {

	protected static createRoot<T extends SlangNode, A>(ctor: new(args: A) => T, args: A): T {
		const root = new ctor(args);
		root.id = "root";
		return root;
	}

	private id = "";
	private lastId = "0";
	private children = new SlangNodeSetBehaviorSubject<SlangNode>("children", []);
	private destroyed = new SlangSubjectTrigger("destroyed");

	protected constructor(private readonly parent: SlangNode | null) {
	}

	public getIdentity(): string {
		if (this.parent) {
			return this.parent.getIdentity() + "." + this.id;
		}
		return "SL";
	}

	public getScopedIdentity(): string {
		return this.id;
	}

	public findNodeById(id: string): SlangNode | undefined {
		const thisId = this.getIdentity();
		if (thisId === id) {
			return this;
		}

		if (!id.startsWith(thisId + ".")) {
			return undefined;
		}

		const idSplit = id.substr(thisId.length + 1).split(".");

		const child = this.getNodeById(idSplit[0]);
		if (!child) {
			return undefined;
		}

		const found = child.findNodeById(id);
		if (found) {
			return found;
		}

		return undefined;
	}

	public getNodeById(id: string): SlangNode | undefined {
		return this.children.getNode(id);
	}

	public getChildNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
		const children: T[] = [];
		for (const childNode of this.children.getNodes()) {
			for (const t of getTypes(types)) {
				if (childNode instanceof t) {
					children.push(childNode as T);
					break;
				}
			}
		}
		return children.values();
	}

	public getChildNode<T extends SlangNode>(types: Types<T>): T | null {
		if (this.children.size() === 0) {
			return null;
		}
		for (const childNode of this.children.getNodes()) {
			for (const t of getTypes(types)) {
				if (childNode instanceof t) {
					return childNode as T;
				}
			}
		}
		return null;
	}

	public scanChildNode<T extends SlangNode>(types: Types<T>, cb: (child: T) => boolean): T | undefined {
		for (const child of this.getChildNodes(types)) {
			if (cb(child)) {
				return child as T;
			}
		}
		return undefined;
	}

	public getParentNode(): SlangNode | null {
		return this.parent;
	}

	public getAncestorNode<T extends SlangNode>(types: Types<T>): T | undefined {
		for (const t of getTypes(types)) {
			if (this instanceof t) {
				return this as any;
			}
		}
		const parentNode = this.getParentNode();
		if (!parentNode) {
			return undefined;
		}
		if (parentNode === this) {
			throw new Error(`reflexive structure detected`);
		}
		return parentNode.getAncestorNode(types);
	}

	public getDescendantNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
		const children: T[] = [];
		for (const childNode of this.getChildNodes(SlangNode)) {
			for (const t of getTypes(types)) {
				if (childNode instanceof t) {
					children.push(childNode as T);
					break;
				}
			}
			for (const descendant of childNode.getDescendantNodes(types)) {
				children.push(descendant);
			}
		}
		return children.values();
	}

	public destroy() {
		for (const child of this.getChildNodes(SlangNode)) {
			child.destroy();
		}
		this.destroyed.next();
	}

	// Events

	public subscribeChildCreated<T extends SlangNode>(types: Types<T>, cb: (child: T) => void) {
		this.children.subscribeAdded((child) => {
			for (const type of getTypes(types)) {
				if (child instanceof type) {
					cb(child as T);
				}
			}
		});
	}

	public subscribeDescendantCreated<T extends SlangNode>(types: Types<T>, cb: (child: T) => void) {
		this.children.subscribeAdded((child) => {
			for (const type of getTypes(types)) {
				if (child instanceof type) {
					cb(child as T);
				}
			}
			child.subscribeDescendantCreated(types, cb);
		});
	}

	public subscribeDestroyed(cb: () => void): void {
		this.destroyed.subscribe(cb);
	}

	protected createChildNode<T extends SlangNode, A>(ctor: new(parent: this, args: A) => T, args: A, cb?: (child: T) => void): T {
		const childNode = new ctor(this, args);
		childNode.id = this.nextId();
		this.children.nextAdd(childNode, cb);
		childNode.subscribeDestroyed(() => {
			this.children.nextRemove(childNode);
		});
		return childNode;
	}

	private nextId(): string {
		this.lastId = Number(Number.parseInt(this.lastId, 16) + 1).toString(16);
		return this.lastId;
	}

}
