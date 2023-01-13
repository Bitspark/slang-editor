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

export const TYPEID_NAMES = Object.keys(TypeIdentifier).filter((i) => typeof (TypeIdentifier as any)[i] === "number");
export const TYPEID_NAMES_NOGEN = TYPEID_NAMES.filter((ti) => ti !== "Generic");

interface SlangTypeStreamJson {
	type: "stream";
	stream: SlangTypeJson;
}

interface SlangTypeMapJson {
	type: "map";
	map: {
		[subName: string]: SlangTypeJson;
	};
}

interface SlangTypeGenericJson {
	type: "generic";
	generic: string;
}

interface SlangTypeUnspecifiedJson {
	type: "unspecified";
}

interface SlangTypeTriggerJson {
	type: "trigger";
}

type SlangTypeIdentifierPrimitiveJson = "string" | "number" | "boolean" | "binary" | "primitive";

interface SlangTypePrimitiveJson {
	type: SlangTypeIdentifierPrimitiveJson;
}

export type SlangTypeJson =
	SlangTypePrimitiveJson
	| SlangTypeGenericJson
	| SlangTypeMapJson
	| SlangTypeStreamJson
	| SlangTypeUnspecifiedJson
	| SlangTypeTriggerJson;

export interface SlangTypeStream extends Array<SlangTypeValue> {}

export interface SlangTypeMap {
	[sub: string]: SlangTypeValue;
}

export type SlangTypeValue = SlangTypeMap | SlangTypeStream | string | number | boolean | null;

export namespace SlangTypeValue {
	export function copy(v: SlangTypeValue): SlangTypeValue {
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
			vcp[sub] = copy(vmp[sub]);
		}
		return vcp;
	}

	export function isUndefined(value: SlangTypeValue | undefined): boolean {
		return typeof value === "undefined";
	}
}

export namespace SlangTypeJson {
	export function equals(a: SlangTypeJson, b: SlangTypeJson): boolean {
		if (a.type !== b.type) {
			return false;
		}

		switch (a.type) {
			case "map":
				const aMap = a.map;
				const bMap = (b as SlangTypeMapJson).map;
				for (const propKey in aMap) {
					if (!aMap.hasOwnProperty(propKey)) {
						continue;
					}
					if (!bMap.hasOwnProperty(propKey)) {
						return false;
					}
					if (!equals(aMap[propKey], bMap[propKey])) {
						return false;
					}
				}
				for (const propKey in bMap) {
					if (!bMap.hasOwnProperty(propKey)) {
						continue;
					}
					if (!aMap.hasOwnProperty(propKey)) {
						return false;
					}
				}
				return true;

			case "stream":
				return equals(a.stream, (b as SlangTypeStreamJson).stream);

			case "generic":
				return a.generic === (b as SlangTypeGenericJson).generic;

			default:
				return true;
		}
	}
}

export class SlangType {
	public static new(tid: TypeIdentifier) {
		return new SlangType(null, tid);
	}

	public static newUnspecified(): SlangType {
		return SlangType.new(TypeIdentifier.Unspecified);
	}

	public static newString(): SlangType {
		return SlangType.new(TypeIdentifier.String);
	}

	public static newBoolean(): SlangType {
		return SlangType.new(TypeIdentifier.Boolean);
	}

	public static newGeneric(identifier: string): SlangType {
		return SlangType.new(TypeIdentifier.Generic).setGenericIdentifier(identifier);
	}

	public static newMap(): SlangType {
		return SlangType.new(TypeIdentifier.Map);
	}

	public static newStream(subTid?: TypeIdentifier): SlangType {
		const strType = SlangType.new(TypeIdentifier.Stream);
		if (!subTid) {
			return strType;
		}
		return SlangType.new(TypeIdentifier.Stream).setStreamSub(SlangType.new(subTid));
	}

	private readonly mapSubs: Map<string, SlangType> | undefined;
	private genericIdentifier?: string;
	private streamSub: SlangType | undefined;

	public constructor(private parent: SlangType | null, private readonly typeIdentifier: TypeIdentifier, private readonly inferred = false) {
		if (this.typeIdentifier === TypeIdentifier.Map) {
			this.mapSubs = new Map<string, SlangType>();
		}
	}

	public getParent(): SlangType | null {
		return this.parent;
	}

	public getTypeDef(): SlangTypeJson {
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				return {
					type: "map",
					map: Array.from(this.getMapSubs()).reduce((obj: any, [name, slType]) => {
						obj[name] = slType.getTypeDef();
						return obj;
					}, {}),
				};
			case TypeIdentifier.Stream:
				return {
					type: "stream",
					stream: this.getStreamSub().getTypeDef(),
				};
			case TypeIdentifier.Generic:
				return {
					type: "generic",
					generic: this.getGenericIdentifier(),
				};
			default:
				return {type: TypeIdentifier[this.typeIdentifier].toLowerCase()} as SlangTypePrimitiveJson | SlangTypeUnspecifiedJson | SlangTypeTriggerJson;
		}
	}

	public jsonify(): object|string {
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				return Object
				.fromEntries(
					Array
					.from(this.getMapSubs())
					.map(([name, slType]) => [name, slType.jsonify()])
				)
			case TypeIdentifier.Stream:
				return [this.getStreamSub().jsonify()]
			case TypeIdentifier.Generic:
				return `[${this.getGenericIdentifier()}]`;
			default:
				return TypeIdentifier[this.typeIdentifier];
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
			const newMap = new SlangType(this.parent, TypeIdentifier.Map, this.inferred);
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
			const newStream = new SlangType(this.parent, TypeIdentifier.Stream, this.inferred);
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
		const typeCopy = new SlangType(this.parent, this.typeIdentifier, this.inferred);
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

	public createMapSub(name: string, type: TypeIdentifier): SlangType {
		const sub = new SlangType(this, type);
		this.addMapSub(name, sub);
		return sub;
	}

	public addMapSub(name: string, type: SlangType): this {
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

	public hasMapSubs(): boolean {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw new Error(`type '${TypeIdentifier[this.typeIdentifier]}' is not a map therefore doesn't have sub types`);
		}
		return this.mapSubs!.size > 0;
	}

	public getMapSubs(): IterableIterator<[string, SlangType]> {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw new Error(`access of map sub types of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		return this.mapSubs!.entries();
	}

	public createStreamSub(type: TypeIdentifier): SlangType {
		const sub = new SlangType(this, type);
		this.setStreamSub(sub);
		return sub;
	}

	public setStreamSub(type: SlangType): this {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw new Error(`set stream sub type of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		type.parent = this;
		this.streamSub = type;
		return this;
	}

	public getStreamSub(): SlangType {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw new Error(`access of stream type of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		if (!this.streamSub) {
			return this.createStreamSub(TypeIdentifier.Unspecified);
		}
		return this.streamSub;
	}

	public setGenericIdentifier(genericIdentifier: string): this {
		if (this.typeIdentifier !== TypeIdentifier.Generic) {
			throw new Error(`set generic identifier of a type of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		this.genericIdentifier = genericIdentifier;
		return this;
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

	/**
	 * Returns <code>true</code> iff this type contains at least one element that is fixed (i.e. that has not been
	 * inferred).
	 */
	public hasAnyFixedSub(): boolean {
		if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.getMapSubs()) {
				if (sub[1].hasAnyFixedSub()) {
					return true;
				}
			}
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
			return this.getStreamSub().hasAnyFixedSub();
		} else if (!this.inferred) {
			return true;
		}

		return false;
	}

	/**
	 * Returns a type which is part of this type but contains only fixed elements (i.e. elements that have not been
	 * inferred).
	 */
	public getOnlyFixedSubs(): SlangType {
		const type = new SlangType(null, this.typeIdentifier);
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const sub of this.getMapSubs()) {
					if (!sub[1].hasAnyFixedSub()) {
						continue;
					}
					const subType = sub[1].getOnlyFixedSubs();
					if (!subType.isVoid()) {
						type.addMapSub(sub[0], subType);
					}
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(this.getStreamSub().getOnlyFixedSubs());
				break;
			case TypeIdentifier.Generic:
				type.setGenericIdentifier(this.getGenericIdentifier());
				break;
			default:
				if (!this.hasAnyFixedSub()) {
					return SlangType.newUnspecified();
				}
		}
		return type;
	}

	public isElementaryPort(): boolean {
		return this.isPrimitive() || this.isTrigger() || this.isGeneric();
	}

	public isPrimitive(): boolean {
		const primitiveTypes = [TypeIdentifier.String, TypeIdentifier.Number, TypeIdentifier.Boolean, TypeIdentifier.Binary, TypeIdentifier.Primitive];
		return primitiveTypes.indexOf(this.getTypeIdentifier()) !== -1;
	}

	public isString(): boolean {
		return this.typeIdentifier === TypeIdentifier.String;
	}

	public isNumber(): boolean {
		return this.typeIdentifier === TypeIdentifier.Number;
	}

	public isBoolean(): boolean {
		return this.typeIdentifier === TypeIdentifier.Boolean;
	}

	public isBinary(): boolean {
		return this.typeIdentifier === TypeIdentifier.Binary;
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

	public isTriggerLike(): boolean {
		if (this.isTrigger()) {
			return true
		}

		if (!this.isMap()) {
			return false
		}

		const mapSubs = Array.from(this.getMapSubs())

		if (mapSubs.length > 1) {
			return false
		}

		// @ts-ignore
		const [portName, portType] = mapSubs[0]

		if (!portType.isTrigger()) {
			return false
		}

		return true
	}
}
