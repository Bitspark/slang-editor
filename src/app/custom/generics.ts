import {SlangType} from "./type";
import {SlangBehaviorSubject} from "./events";
import {Subscription} from "rxjs";

export class GenericSpecifications {
	private genericTypes: Map<string, SlangBehaviorSubject<SlangType | null>>;

	public constructor(private genericIdentifiers: Array<string>) {
		this.genericTypes = new Map<string, SlangBehaviorSubject<SlangType | null>>();
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
			console.log(this.genericIdentifiers);
			throw `unknown generic identifier ${identifier}`;
		}
		const subject = this.getSubject(identifier, type);
		if (subject.getValue() !== type) {
			subject.next(type);
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
	
	public clear(identifier: string): void {
		if (this.genericIdentifiers.indexOf(identifier) === -1) {
			return;
		}
		const subject = this.getSubject(identifier);
		subject.next(null);
	}
	
	public subscribeGenericTypeChanged(identifier: string, cb: (type: SlangType | null) => void): Subscription {
		return this.getSubject(identifier).subscribe(cb);
	}
	
}
