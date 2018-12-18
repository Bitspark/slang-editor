import {GenericSpecifications} from "./generics";
import {PropertyAssignments} from "../model/property";
import {PropertyEvaluator} from "./utils";

export enum TypeIdentifier {
	// Unspecified, // 0
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
	type: TypeIdentifier.Stream
	stream: SlangTypeDef
}

interface SlangTypeDefMap {
	type: TypeIdentifier.Map
	map: {
		[portName: string]: SlangTypeDef,
	}
}

interface SlangTypeDefGeneric {
	type: TypeIdentifier.Generic
	generic: string
}

interface SlangTypeDefPrimitive {
	type: TypeIdentifier.String | TypeIdentifier.Number | TypeIdentifier.Boolean | TypeIdentifier.Binary | TypeIdentifier.Trigger | TypeIdentifier.Primitive
}


export type SlangTypeDef = SlangTypeDefPrimitive | SlangTypeDefGeneric | SlangTypeDefMap | SlangTypeDefStream;

export class SlangType {
	private readonly mapSubs: Map<string, SlangType> | undefined;
	private genericIdentifier?: string;
	private streamSub: SlangType | undefined;

	public getTypeDef(): SlangTypeDef {
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				return {
					type: this.typeIdentifier,
					map: Array.from(this.getMapSubs()).reduce((obj: any, [name, slType]) => {
						obj[name] = slType.getTypeDef();
						return obj;
					}, {})
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
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
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
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
			const newStream = new SlangType(this.parent, TypeIdentifier.Stream);
			newStream.setStreamSub(this.getStreamSub().union(other.getStreamSub()));
			return newStream;
		}

		if (this.typeIdentifier === TypeIdentifier.Generic) {
			if (this.genericIdentifier !== other.genericIdentifier) {
				throw new Error(`generics not unifiable ${this.genericIdentifier} != ${other.genericIdentifier}`);
			}
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
			for (const [subName,] of other.getMapSubs()) {
				const sub = this.findMapSub(subName);
				if (!sub) {
					return false;
				}
			}
			return true;
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
			return this.getStreamSub().equals(other.getStreamSub());
		} else if (this.typeIdentifier === TypeIdentifier.Generic) {
			return this.genericIdentifier === other.genericIdentifier;
		}

		return true;
	}

	public constructor(private parent: SlangType | null, private typeIdentifier: TypeIdentifier) {
		if (this.typeIdentifier === TypeIdentifier.Map) {
			this.mapSubs = new Map<string, SlangType>();
		}
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

	public expand(propAssigns: PropertyAssignments): SlangType {
		const type = new SlangType(this.parent, this.typeIdentifier);
		switch (this.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of this.getMapSubs()) {
					for (const expSubName of PropertyEvaluator.expand(subName, propAssigns)) {
						type.addMapSub(expSubName, subType.expand(propAssigns));
					}
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(this.getStreamSub().expand(propAssigns));
				break;
			case TypeIdentifier.Generic:
				type.setGenericIdentifier(this.getGenericIdentifier());
				break;
		}

		return type;
	}

	public specifyGenerics(genSpec: GenericSpecifications): SlangType {
		if (this.typeIdentifier === TypeIdentifier.Generic) {
			const identifier = this.getGenericIdentifier();
			if (genSpec.has(identifier)) {
				return genSpec.get(this.getGenericIdentifier()).copy();
			} else {
				return this.copy();
			}
		}
		const specifiedType = new SlangType(this.parent, this.typeIdentifier);
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of this.getMapSubs()) {
					specifiedType.addMapSub(subName, subType.specifyGenerics(genSpec));
				}
				break;
			case TypeIdentifier.Stream:
				specifiedType.setStreamSub(this.getStreamSub().specifyGenerics(genSpec));
				break;
		}
		return specifiedType;
	}

	public addMapSub(name: string, port: SlangType): SlangType {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw `add map sub port to a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		this.mapSubs!.set(name, port);
		port.parent = this;
		return this;
	}

	public findMapSub(name: string): SlangType | null {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw `find map sub port to a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		return this.mapSubs!.get(name) || null;
	}

	public getMapSubs(): IterableIterator<[string, SlangType]> {
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			throw `access of map sub ports of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		return this.mapSubs!.entries();
	}

	public setStreamSub(port: SlangType) {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw `set stream sub port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		port.parent = this;
		this.streamSub = port;
	}

	public getStreamSub(): SlangType {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw `access of stream port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		if (!this.streamSub) {
			throw `stream port not having sub stream port`;
		}
		return this.streamSub;
	}

	public setGenericIdentifier(genericIdentifier: string) {
		if (this.typeIdentifier !== TypeIdentifier.Generic) {
			throw `set generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		this.genericIdentifier = genericIdentifier;
	}

	public getGenericIdentifier(): string {
		if (this.typeIdentifier !== TypeIdentifier.Generic) {
			throw new Error(`access of generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		if (!this.genericIdentifier) {
			throw new Error(`generic port requires a generic identifier`);
		}
		return this.genericIdentifier;
	}

	public getTypeIdentifier(): TypeIdentifier {
		return this.typeIdentifier;
	}

	public isPrimitive(): boolean {
		const primitiveTypes = [TypeIdentifier.String, TypeIdentifier.Number, TypeIdentifier.Boolean, TypeIdentifier.Binary, TypeIdentifier.Primitive];
		return primitiveTypes.indexOf(this.getTypeIdentifier()) !== -1;
	}

	public toString(tab?: string): string {
		if (!tab) {
			tab = "";
		}

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

export type SlangTypeValue = { [k: string]: any } | [] | string | number | boolean | null;
