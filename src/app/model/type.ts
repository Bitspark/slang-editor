import {SlangNode} from "../custom/nodes";

export enum SlangType {
    Number,
    Binary,
    Boolean,
    String,
    Trigger,
    Primitive,
    Generic,
    Stream,
    Map,
}

export class TypeModel extends SlangNode {
    private readonly mapSubs: Map<string, TypeModel> | undefined;
    private streamSub: TypeModel | undefined;

    public constructor(protected parent: TypeModel | null, protected type: SlangType) {
        super();
        if (this.type === SlangType.Map) {
            this.mapSubs = new Map<string, TypeModel>();
        }
    }

    public addMapSub(name: string, port: TypeModel): TypeModel {
        if (this.type !== SlangType.Map) {
            throw `add map sub port to a port of type '${this.type}' not possible`;
        }
        this.mapSubs!.set(name, port);
        port.parent = this;
        return this;
    }

    public getMapSubs(): IterableIterator<[string, TypeModel]> {
        if (this.type !== SlangType.Map) {
            throw `access of map sub ports of a port of type '${this.type}' not possible`;
        }
        return this.mapSubs!.entries();
    }

    public findMapSub(name: string): TypeModel {
        if (this.type !== SlangType.Map) {
            throw `access of map sub port of a port of type '${this.type}' not possible`;
        }
        const mapSub = this.mapSubs!.get(name);
        if (!mapSub) {
            throw `map sub port ${name} not found`
        }
        return mapSub;
    }

    public setStreamSub(port: TypeModel) {
        if (this.type !== SlangType.Stream) {
            throw `set stream sub port of a port of type '${this.type}' not possible`;
        }
        port.parent = this;
        this.streamSub = port;
    }

    public getStreamSub(): TypeModel {
        if (this.type !== SlangType.Stream) {
            throw `${this.getIdentity()}: access of stream port of a port of type '${this.type}' not possible`;
        }
        if (!this.streamSub) {
            throw `${this.getIdentity()}: stream port not having sub stream port`;
        }
        return this.streamSub;
    }

    public getType(): SlangType {
        return this.type;
    }

    public getName(): string {
        if (!this.parent || this.parent.getType() !== SlangType.Map) {
            throw `not a map entry`;
        }

        for (const entry of this.parent.getMapSubs()) {
            if (entry[1] === this) {
                return entry[0];
            }
        }

        throw `entry not found`;
    }

    private getReferenceString(): string {
        if (!this.parent) {
            return '';
        }
        const parentRefString = this.parent.getReferenceString();
        if (this.parent.getType() === SlangType.Map) {
            if (parentRefString === '') {
                return this.getName();
            }
            return parentRefString + '.' + this.getName();
        } else if (this.parent.getType() === SlangType.Stream) {
            if (parentRefString === '') {
                return '~';
            }
            return parentRefString + '.~';
        }
        return parentRefString;
    }

    public getIdentity(): string {
        return this.getReferenceString();
    }


    // Slang tree
    public getChildNodes(): IterableIterator<SlangNode> {
        const children: Array<SlangNode> = [];
        switch (this.type) {
            case SlangType.Map:
                for (const mapSub of this.getMapSubs()) {
                    children.push(mapSub[1]);
                }
                break;
            case SlangType.Stream:
                children.push(this.getStreamSub());
                break;
        }
        return children.values();
    }

    public getParentNode(): SlangNode | null {
        return this.parent;
    }
}
