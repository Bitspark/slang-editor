import {Subscription} from "rxjs";

import {SlangType} from "../../../definitions/type";
import {PortModel} from "../port";

import {SlangBehaviorSubject, SlangSubject} from "./events";

export class GenericSpecifications {
	private readonly genericIdentifiers: string[];
	private readonly genericsChanged = new SlangSubject<[string, SlangType | null]>("specifications-changed");
	private readonly genericTypes = new Map<string, SlangBehaviorSubject<SlangType | null>>();
	private readonly ports = new Map<string, Set<PortModel>>();

	public constructor(genIds: Iterable<string>) {
		this.genericIdentifiers = Array.from(genIds)
	}

	public identifiers(): IterableIterator<string> {
		return this.genericIdentifiers.values();
	}

	public copy(): GenericSpecifications {
		const copy = new GenericSpecifications(this.genericIdentifiers)
		Array.from(this.getIterator()).forEach(([genId, type]) => {
			copy.specify(genId, type);
		});
		return copy;
	}

	public specify(identifier: string, type: SlangType): void {
		if (this.genericIdentifiers.indexOf(identifier) === -1) {
			throw new Error(`unknown generic identifier ${identifier}`);
		}
		const subject = this.getSubject(identifier, type);
		if (subject.getValue() !== type) {
			subject.next(type);
			this.genericsChanged.next([identifier, type]);
		}
	}

	public get(identifier: string): SlangType {
		const generic = this.genericTypes.get(identifier);
		if (!generic) {
			throw new Error(`generic is not specified: ${identifier}`);
		}
		const type = generic.getValue();
		if (!type) {
			throw new Error(`generic is not specified: ${identifier}`);
		}
		return type;
	}

	public *getIterator(): IterableIterator<[string, SlangType]> {
		// TODO don't return null but Unspecified
		for (const [genName, subject] of this.genericTypes.entries()) {
			const genType = subject.getValue();
			if (genType) {
				yield [genName, genType!];
			}
		}
	}

	public has(identifier: string): boolean {
		return this.genericTypes.has(identifier);
	}

	public clear(identifier: string): void {
		if (this.genericIdentifiers.indexOf(identifier) === -1) {
			return;
		}
		const subject = this.getSubject(identifier);
		subject.next(null);
	}

	public registerPort(identifier: string, port: PortModel) {
		let portSet = this.ports.get(identifier);
		if (!portSet) {
			portSet = new Set<PortModel>();
			this.ports.set(identifier, portSet);
		}
		portSet.add(port);
	}

	public unregisterPort(identifier: string, port: PortModel) {
		const portSet = this.ports.get(identifier);
		if (portSet) {
			portSet.delete(port);
		}
	}

	public getUnifiedType(identifier: string): SlangType | null {
		const portSet = this.ports.get(identifier);
		if (!portSet) {
			return null;
		}
		let unifiedType = this.get(identifier).getOnlyFixedSubs();
		for (const registeredPort of portSet) {
			unifiedType = unifiedType.union(registeredPort.getConnectedType());
		}
		return unifiedType;
	}

	public subscribeGenericTypeChanged(identifier: string, cb: (type: SlangType | null) => void): Subscription {
		return this.getSubject(identifier).subscribe(cb);
	}

	public subscribeGenericsChanged(cb: (generic: [string, SlangType | null]) => void): Subscription {
		return this.genericsChanged.subscribe(cb);
	}

	private getSubject(identifier: string, initial: SlangType | null = null): SlangBehaviorSubject<SlangType | null> {
		const generic = this.genericTypes.get(identifier);
		if (generic) {
			return generic;
		}
		const newGeneric = new SlangBehaviorSubject<SlangType | null>("generic", initial);
		this.genericTypes.set(identifier, newGeneric);
		return newGeneric;
	}
}
