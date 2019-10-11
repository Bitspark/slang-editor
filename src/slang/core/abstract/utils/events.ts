import {BehaviorSubject, Subject, Subscription} from "rxjs";

import {SlangNode} from "../nodes";

export class SlangSubject<T> extends Subject<T> {
	constructor(public readonly name: string) {
		super();
	}
}

export class SlangSubjectTrigger extends SlangSubject<void> {
}

export class SlangBehaviorSubject<T> extends BehaviorSubject<T> {
	constructor(public readonly name: string, initial: T) {
		super(initial);
	}
}

export class SlangBagSubject<T> {
	private readonly subjectAdded = new Subject<T>();
	private readonly subjectRemoved = new Subject<T>();

	constructor(public readonly name: string) {
	}

	public nextAdd(value: T) {
		this.subjectAdded.next(value);
	}

	public nextRemove(value: T) {
		this.subjectRemoved.next(value);
	}

	public subscribe(nextAdd: (value: T) => void, nextRemove: (value: T) => void): [Subscription, Subscription] {
		return [this.subscribeAdded(nextAdd), this.subscribeRemoved(nextRemove)];
	}

	public subscribeAdded(next: (value: T) => void): Subscription {
		return this.subjectAdded.subscribe(next);
	}

	public subscribeRemoved(next: (value: T) => void): Subscription {
		return this.subjectRemoved.subscribe(next);
	}
}

export class SlangNodeSetBehaviorSubject<T extends SlangNode> extends SlangBagSubject<T> {
	private readonly nodes: Map<string, T> = new Map<string, T>();

	constructor(name: string, initial: T[]) {
		super(name);
		initial.forEach((node) => this.nodes.set(node.getScopedIdentity(), node));
	}

	public nextAdd<U extends T>(value: U, cb?: (node: U) => void) {
		if (this.nodes.has(value.getScopedIdentity())) {
			return;
		}
		this.nodes.set(value.getScopedIdentity(), value);
		if (cb) {
			cb(value);
		}
		super.nextAdd(value);
	}

	public nextRemove(value: T) {
		if (this.nodes) {
			if (this.nodes && !this.nodes.has(value.getScopedIdentity())) {
				return;
			}
			this.nodes.delete(value.getScopedIdentity());
		}
		super.nextRemove(value);
	}

	public subscribeAdded(next: (value: T) => void): Subscription {
		if (this.nodes) {
			this.nodes.forEach((node) => {
				next(node);
			});
		}
		return super.subscribeAdded(next);
	}

	public size(): number {
		return this.nodes.size;
	}

	public getNode(scopedId: string): T | undefined {
		return this.nodes.get(scopedId);
	}

	public getNodes(): IterableIterator<T> {
		return this.nodes.values();
	}
}
