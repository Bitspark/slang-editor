import {BehaviorSubject, Subject, Subscription} from "rxjs";
import {SlangNode} from "./nodes";

abstract class BaseSlangSubject<T> {

	protected constructor(protected readonly name: string) {
	}

}

export class SlangSubject<T> extends BaseSlangSubject<T> {
	private readonly subject = new Subject<T>();

	constructor(name: string) {
		super(name);
	}

	public next(value: T) {
		this.subject.next(value);
	}

	public subscribe(next: (value: T) => void): Subscription {
		return this.subject.subscribe(next);
	}
}

export class SlangSubjectTrigger extends BaseSlangSubject<void> {
	private readonly subject = new Subject<void>();

	constructor(name: string) {
		super(name);
	}

	public next() {
		this.subject.next();
	}

	public subscribe(next: () => void): Subscription {
		return this.subject.subscribe(next);
	}
}

export class SlangBehaviorSubject<T> extends BaseSlangSubject<T> {
	private readonly subject: BehaviorSubject<T>;

	constructor(name: string, initial: T) {
		super(name);
		this.subject = new BehaviorSubject<T>(initial);
	}

	public next(value: T) {
		this.subject.next(value);
	}

	public subscribe(next: (value: T) => void): Subscription {
		return this.subject.subscribe(next);
	}

	public getValue(): T {
		return this.subject.getValue();
	}
}

export class SlangBagSubject<T> extends BaseSlangSubject<T> {
	private readonly subjectAdded = new Subject<T>();
	private readonly subjectRemoved = new Subject<T>();

	constructor(protected readonly name: string) {
		super(name);
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

	constructor(protected readonly name: string, initial: Array<T>) {
		super(name);
		initial.forEach(node => this.nodes.set(node.getScopedIdentity(), node));
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
			this.nodes.forEach(node => next(node));
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
