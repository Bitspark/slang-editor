import {GenericSpecifications} from "../model/generic";

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

export class SlangType {
    private readonly mapSubs: Map<string, SlangType> | undefined;
    private genericIdentifier?: string;
    private streamSub: SlangType | undefined;

    public constructor(private parent: SlangType | null, private type: TypeIdentifier) {
        if (this.type === TypeIdentifier.Map) {
            this.mapSubs = new Map<string, SlangType>();
        }
    }

    public copy(): SlangType {
        const typeCopy = new SlangType(this.parent, this.type);
        switch (this.type) {
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

    public specifyGenerics(genSpec: GenericSpecifications): SlangType {
        if (this.type === TypeIdentifier.Generic) {
            return genSpec.get(this.getGenericIdentifier()).copy();
        }
        const specifiedType = new SlangType(this.parent, this.type);
        switch (this.type) {
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
        if (this.type !== TypeIdentifier.Map) {
            throw `add map sub port to a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        this.mapSubs!.set(name, port);
        port.parent = this;
        return this;
    }

    public getMapSubs(): IterableIterator<[string, SlangType]> {
        if (this.type !== TypeIdentifier.Map) {
            throw `access of map sub ports of a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        return this.mapSubs!.entries();
    }

    public setStreamSub(port: SlangType) {
        if (this.type !== TypeIdentifier.Stream) {
            throw `set stream sub port of a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        port.parent = this;
        this.streamSub = port;
    }

    public getStreamSub(): SlangType {
        if (this.type !== TypeIdentifier.Stream) {
            throw `access of stream port of a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        if (!this.streamSub) {
            throw `stream port not having sub stream port`;
        }
        return this.streamSub;
    }

    public setGenericIdentifier(genericIdentifier: string) {
        if (this.type !== TypeIdentifier.Generic) {
            throw `set generic identifier of a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        this.genericIdentifier = genericIdentifier;
    }

    public getGenericIdentifier(): string {
        if (this.type !== TypeIdentifier.Generic) {
            throw `access of generic identifier of a port of type '${TypeIdentifier[this.type]}' not possible`;
        }
        if (!this.genericIdentifier) {
            throw `generic port requires a generic identifier`;
        }
        return this.genericIdentifier;
    }

    public getTypeIdentifier(): TypeIdentifier {
        return this.type;
    }
}
