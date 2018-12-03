import {GenericSpecifications} from "../model/generic";
import {PropertyAssignments} from "../model/property";
import {PropertyEvaluator} from "./utils";

export enum TypeIdentifier {
	Number, // 0
	Binary, // 1
	Boolean, // 2
	String, // 3
	Trigger, // 4
	Primitive, // 5
	Generic, // 6
	Stream, // 7
	Map, // 8
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

export function isEqual(a: SlangTypeDef, b: SlangTypeDef): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}


export class SlangType {
	private readonly mapSubs: Map<string, SlangType> | undefined;
	private genericIdentifier?: string;
	private streamSub: SlangType | undefined;


	public toSlangTypeDef(): SlangTypeDef {
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				return {
					type: this.typeIdentifier,
					map: Array.from(this.getMapSubs()).reduce((obj: any, [name, slType]) => {
						obj[name] = slType.toSlangTypeDef();
						return obj;
					}, {})
				};
			case TypeIdentifier.Stream:
				return {
					type: this.typeIdentifier,
					stream: this.getStreamSub().toSlangTypeDef(),
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
			return genSpec.get(this.getGenericIdentifier()).copy();
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
			throw `access of generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
		}
		if (!this.genericIdentifier) {
			throw `generic port requires a generic identifier`;
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

}

export type SlangTypeValue = { [k: string]: any } | [] | string | number | boolean | null;
