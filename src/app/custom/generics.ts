import {SlangType} from "./type";
import {SlangBehaviorSubject, SlangSubject} from "./events";
import {Subscription} from "rxjs";
import {PortModel} from "../model/port";

export class GenericSpecifications {
	private readonly genericsChanged = new SlangSubject<[string, SlangType | null]>("generics-changed");
	private readonly genericTypes = new Map<string, SlangBehaviorSubject<SlangType | null>>();
	private readonly ports = new Map<string, Set<PortModel>>();

	public constructor(private genericIdentifiers: Array<string>) {
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
	
	public specify(identifier: string, type: SlangType): void {
		if (this.genericIdentifiers.indexOf(identifier) === -1) {
			throw `unknown generic identifier ${identifier}`;
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
			throw `generic is not specified: ${identifier}`;
		}
		const type = generic.getValue();
		if (!type) {
			throw `generic is not specified: ${identifier}`;
		}
		return type;
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
		let portSet = this.ports.get(identifier);
		if (portSet) {
			portSet.delete(port);
		}
	}
	
	public getUnifiedType(identifier: string): SlangType | null {
		let portSet = this.ports.get(identifier);
		if (!portSet) {
			return null;
		}
		let unifiedType: SlangType | null = null;
		for (const registeredPort of portSet) {
			if (!unifiedType) {
				unifiedType = registeredPort.getConnectedType();
			} else {
				unifiedType = unifiedType.union(registeredPort.getConnectedType());
			}
		}
		return unifiedType;
	}
	
	public subscribeGenericTypeChanged(identifier: string, cb: (type: SlangType | null) => void): Subscription {
		return this.getSubject(identifier).subscribe(cb);
	}

	public subscribeGenericsChanged(cb: (generic: [string, SlangType | null]) => void): Subscription {
		return this.genericsChanged.subscribe(cb);
	}
	
}
