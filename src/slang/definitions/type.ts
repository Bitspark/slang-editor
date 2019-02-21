export enum TypeIdentifier {
	Unspecified, // 0
	Number, // 1
	Binary, // 2
	Boolean, // 3
	String, // 4
	Trigger, // 5
	Primitive, // 6
	Generic, // 7
	Stream, // 8
	Map, // 9
}

interface SlangTypeDefStream {
	type: TypeIdentifier.Stream;
	stream: SlangTypeDef;
}

interface SlangTypeDefMap {
	type: TypeIdentifier.Map;
	map: {
		[subName: string]: SlangTypeDef,
	};
}

interface SlangTypeDefGeneric {
	type: TypeIdentifier.Generic;
	generic: string;
}

interface SlangTypeDefPrimitive {
	type: TypeIdentifier.String | TypeIdentifier.Number | TypeIdentifier.Boolean | TypeIdentifier.Binary | TypeIdentifier.Trigger | TypeIdentifier.Primitive | TypeIdentifier.Unspecified;
}

export type SlangTypeDef = SlangTypeDefPrimitive | SlangTypeDefGeneric | SlangTypeDefMap | SlangTypeDefStream;

interface SlangTypeStream extends Array<SlangTypeValue> {
}

interface SlangTypeMap {
	[sub: string]: SlangTypeValue;
}

export type SlangTypeValue = SlangTypeMap | SlangTypeStream | string | number | boolean | null;

export function copySlangTypeValue(v: SlangTypeValue): SlangTypeValue {
	if (["string", "number", "boolean", "null", "undefined"].indexOf(typeof v) !== -1) {
		return v;
	}

	if (Array.isArray(v)) {
		return Array.from(v.values());
	}

	const vcp: SlangTypeMap = {};
	const vmp = v as SlangTypeMap;
	for (const sub in vmp) {
		if (!vmp.hasOwnProperty(sub)) {
			continue;
		}
		vcp[sub] = copySlangTypeValue(vmp[sub]);
	}
	return vcp;
}

export function isUndefined(value: SlangTypeValue | undefined): boolean {
	return typeof value === "undefined";
}

export namespace SlangTypeDef {
	export function isEqual(a: SlangTypeDef, b: SlangTypeDef): boolean {
		if (a.type !== b.type) {
			return false;
		}

		switch (a.type) {
			case TypeIdentifier.Map:
				const aMap = a.map;

				if (b.type !== TypeIdentifier.Map) {
					return false;
				}

				const bMap = b.map;

				for (const propKey in aMap) {
					if (!aMap.hasOwnProperty(propKey)) {
						continue;
					}
					if (!bMap.hasOwnProperty(propKey)) {
						return false;
					}
					if (!isEqual(aMap[propKey], bMap[propKey])) {
						return false;
					}
				}
				break;

			case TypeIdentifier.Stream:
				if (b.type !== TypeIdentifier.Stream) {
					return false;
				}

				if (!isEqual(a.stream, b.stream)) {
					return false;
				}
				break;

			case TypeIdentifier.Generic:
				return false;
		}

		return true;
	}
}

export class SlangType {

	public static newUnspecified(): SlangType {
		return new SlangType(null, TypeIdentifier.Unspecified);
	}

	public static newNumber(): SlangType {
		return new SlangType(null, TypeIdentifier.Number);
	}

	public static newString(): SlangType {
		return new SlangType(null, TypeIdentifier.String);
	}

	public static newGeneric(identifier: string): SlangType {
		const type = new SlangType(null, TypeIdentifier.Generic);
		type.setGenericIdentifier(identifier);
		return type;
	}

	public static newMap(): SlangType {
		return new SlangType(null, TypeIdentifier.Map);
	}

	public static newStream(subType: SlangType): SlangType {
		const streamType = new SlangType(null, TypeIdentifier.Stream);
		streamType.setStreamSub(subType);
		return streamType;
	}

	private readonly mapSubs: Map<string, SlangType> | undefined;
	private genericIdentifier?: string;
	private streamSub: SlangType | undefined;

	public constructor(private parent: SlangType | null, private typeIdentifier: TypeIdentifier) {
		if (this.typeIdentifier === TypeIdentifier.Map) {
			this.mapSubs = new Map<string, SlangType>();
		}
	}

	public getParent(): SlangType | null {
		return this.parent;
	}

	public getTypeDef(): SlangTypeDef {
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				return {
					type: this.typeIdentifier,
					map: Array.from(this.getMapSubs()).reduce((obj: any, [name, slType]) => {
						obj[name] = slType.getTypeDef();
						return obj;
					}, {}),
				};
			case TypeIdentifier.Stream:
				return {
					type: this.typeIdentifier,
					stream: this.getStreamSub().getTypeDef(),
				};
			case TypeIdentifier.Generic:
				return {
					type: this.typeIdentifier,
					generic: this.getGenericIdentifier(),
				};
			default:
				return {type: this.typeIdentifier};
		}

	}

	public isVoid(): boolean {
		if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.getMapSubs()) {
				if (!sub[1].isVoid()) {
					return false;
				}
			}
			return true;
		}
		if (this.typeIdentifier === TypeIdentifier.Stream) {
			return this.getStreamSub().isVoid();
		}

		return false;
	}

	public union(other: SlangType): SlangType {
		if (this.typeIdentifier !== other.typeIdentifier) {
			throw new Error(`types not unifiable`);
		}

		if (this.typeIdentifier === TypeIdentifier.Map) {
			const newMap = new SlangType(this.parent, TypeIdentifier.Map);
			for (const [subName, sub1] of this.getMapSubs()) {
				const sub2 = other.findMapSub(subName);
				let newSub: SlangType;
				if (sub2) {
					newSub = sub1.union(sub2);
				} else {
					newSub = sub1.copy();
				}
				if (!newSub.isVoid()) {
					newMap.addMapSub(subName, newSub);
				}
			}
			for (const [subName, sub1] of other.getMapSubs()) {
				const sub2 = newMap.findMapSub(subName);
				if (!sub2) {
					newMap.addMapSub(subName, sub1.copy());
				}
			}
			return newMap;
		}
		if (this.typeIdentifier === TypeIdentifier.Stream) {
			const newStream = new SlangType(this.parent, TypeIdentifier.Stream);
			newStream.setStreamSub(this.getStreamSub().union(other.getStreamSub()));
			return newStream;
		}

		if (this.typeIdentifier === TypeIdentifier.Generic && this.genericIdentifier !== other.genericIdentifier) {
			throw new Error(`generics not unifiable ${this.genericIdentifier} != ${other.genericIdentifier}`);
		}

		return this.copy();
	}

	public equals(other: SlangType): boolean {
		if (this.typeIdentifier !== other.typeIdentifier) {
			return false;
		}

		if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const [subName, sub1] of this.getMapSubs()) {
				const sub2 = other.findMapSub(subName);
				if (!sub2 || !sub1.equals(sub2)) {
					return false;
				}
			}
			for (const [subName] of other.getMapSubs()) {
				const sub = this.findMapSub(subName);
				if (!sub) {
					return false;
				}
			}
			return true;
		}

		if (this.typeIdentifier === TypeIdentifier.Stream) {
			return this.getStreamSub().equals(other.getStreamSub());
		}

		if (this.typeIdentifier === TypeIdentifier.Generic) {
			return this.genericIdentifier === other.genericIdentifier;
		}

		return true;
	}

	public copy(): SlangType {
		const typeCopy = new SlangType(this.parent, this.typeIdentifier);
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of this.getMapSubs()) {
					typeCopy.addMapSub(subName, subType.copy());
				}
				break;
			case TypeIdentifier.Stream:
				typeCopy.setStreamSub(this.getStreamSub().copy());
				break;
			case TypeIdentifier.Generic:
				typeCopy.setGenericIdentifier(this.getGenericIdentifier());
				break;
		}
		return typeCopy;
	}

	public addMapSub(name: string, type: SlangType): SlangType {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw new Error(`add map sub type to a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		this.mapSubs!.set(name, type);
		type.parent = this;
		return this;
	}

	public findMapSub(name: string): SlangType | null {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw new Error(`find map sub type to a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		return this.mapSubs!.get(name) || null;
	}

	public getMapSubs(): IterableIterator<[string, SlangType]> {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw new Error(`access of map sub types of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		return this.mapSubs!.entries();
	}

	public setStreamSub(type: SlangType) {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw new Error(`set stream sub type of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		type.parent = this;
		this.streamSub = type;
	}

	public getStreamSub(): SlangType {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw new Error(`access of stream type of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		if (!this.streamSub) {
			throw new Error(`stream type not having sub stream type`);
		}
		return this.streamSub;
	}

	public setGenericIdentifier(genericIdentifier: string) {
		if (this.typeIdentifier !== TypeIdentifier.Generic) {
			throw new Error(`set generic identifier of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		this.genericIdentifier = genericIdentifier;
	}

	public getGenericIdentifier(): string {
		if (this.typeIdentifier !== TypeIdentifier.Generic) {
			throw new Error(`access of generic identifier of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		if (!this.genericIdentifier) {
			throw new Error(`generic type without generic identifier`);
		}
		return this.genericIdentifier;
	}

	public getTypeIdentifier(): TypeIdentifier {
		return this.typeIdentifier;
	}

	public isElementaryPort(): boolean {
		return this.isPrimitive() || this.isTrigger() || this.isGeneric();
	}

	public isPrimitive(): boolean {
		const primitiveTypes = [TypeIdentifier.String, TypeIdentifier.Number, TypeIdentifier.Boolean, TypeIdentifier.Binary, TypeIdentifier.Primitive];
		return primitiveTypes.indexOf(this.getTypeIdentifier()) !== -1;
	}

	public isMap(): boolean {
		return this.typeIdentifier === TypeIdentifier.Map;
	}

	public isStream(): boolean {
		return this.typeIdentifier === TypeIdentifier.Stream;
	}

	public isGeneric(): boolean {
		return this.typeIdentifier === TypeIdentifier.Generic;
	}

	public isUnspecified(): boolean {
		return this.typeIdentifier === TypeIdentifier.Unspecified;
	}

	public isTrigger(): boolean {
		return this.typeIdentifier === TypeIdentifier.Trigger;
	}

	public toString(tab = ""): string {
		let str = TypeIdentifier[this.typeIdentifier] + "\n";
		if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.mapSubs!) {
				str += tab + "  " + sub[0] + ": " + sub[1].toString(tab + "  ");
			}
		}
		if (this.typeIdentifier === TypeIdentifier.Stream) {
			str += tab + "  " + this.streamSub!.toString(tab + "  ");
		}
		if (this.typeIdentifier === TypeIdentifier.Generic) {
			str += tab + "  " + "identifier: " + this.genericIdentifier;
		}

		return str;
	}
}
