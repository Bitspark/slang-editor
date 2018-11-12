import {PortDirection, PortModel} from "../model/port";
import {DelegateModel} from "../model/delegate";
import {SlangType, TypeIdentifier} from "./type";
import {Subject, Subscription} from "rxjs";

type Type<T> = Function & { prototype: T };

export abstract class SlangNode {

    abstract getIdentity(): string;

    abstract getChildNodes(): IterableIterator<SlangNode>;

    abstract getParentNode(): SlangNode | null;

    getAncestorNode<T extends SlangNode>(...types: Array<Type<T>>): T | undefined {
        if (types.length === 0) {
            return undefined;
        }
        for (const t of types) {
            if (this instanceof t) {
                return this as any;
            }
        }
        const parentNode = this.getParentNode();
        if (!parentNode) {
            return undefined;
        }
        return parentNode.getAncestorNode<T>(...types);
    }

    getTopMostAncestorNode<T extends SlangNode>(...types: Array<Type<T>>): T | undefined {
        if (types.length === 0) {
            return undefined;
        }
        const parentNode = this.getParentNode();
        if (!parentNode) {
            return this as any;
        }
        let hasType = false;
        for (const t of types) {
            if (parentNode instanceof t) {
                hasType = true;
                break;
            }
        }
        if (!hasType) {
            return this as any;
        }
        return parentNode.getTopMostAncestorNode<T>(...types);
    }

    getDescendentNodes<T extends SlangNode>(...types: Array<Type<T>>): IterableIterator<T> {
        const children: Array<T> = [];
        if (types.length === 0) {
            return children.values();
        }
        for (const childNode of this.getChildNodes()) {
            for (const t of types) {
                if (childNode instanceof t) {
                    children.push(childNode as T);
                    break;
                }
            }
            for (const descendant of childNode.getDescendentNodes<T>(...types)) {
                children.push(descendant);
            }
        }
        return children.values();
    }

    // TODO: Can be heavily optimized
    public find(id: string): SlangNode | undefined {
        if (this.getIdentity() === id) {
            return this;
        }

        for (const child of this.getChildNodes()) {
            const found = child.find(id);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    public getRoot(): SlangNode {
        if (!this.getParentNode()) {
            return this;
        }
        return this.getParentNode()!;
    }

}

export class Stream {
    private static id = "0";
    private readonly id: string;
    private replaced = new Subject<Stream>();
    private subscriptions: Array<Subscription> = [];

    constructor(private baseStream: Stream | null, private sourcePort: PortModel | undefined) {
        Stream.id = (Number.parseInt(Stream.id, 16) + 1).toString(16);
        this.id = Stream.id;

        if (baseStream) {
            if (baseStream.hasAncestor(this)) {
                throw new Error(`stream circle detected`);
            }
            baseStream.subscribeReplaced(newStream => {
                this.baseStream = newStream;
            });
        }
    }

    public getId(): string {
        return this.id;
    }

    public getBaseStream(): Stream | null {
        return this.baseStream;
    }

    public getPort(): PortModel | undefined {
        return this.sourcePort;
    }

    public setSourcePort(port: PortModel): void {
        this.sourcePort = port;
    }

    public getStreamDepth(): number {
        if (this.baseStream) {
            return this.baseStream.getStreamDepth() + 1;
        }
        return 1;
    }
    
    private hasAncestor(stream: Stream): boolean {
        if (stream === this) {
            return true;
        }
        if (this.baseStream) {
            return this.baseStream.hasAncestor(stream);
        }
        return false;
    }

    public replace(stream: Stream): void {
        if (stream === this) {
            return;
        }
        if (stream.hasAncestor(this)) {
            console.error(this, stream);
            throw new Error(`stream circle detected: ${stream.id}`);
        }
        this.replaced.next(stream);
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    public subscribeReplaced(cb: (newStream: Stream) => void) {
        this.subscriptions.push(this.replaced.subscribe(cb));
    }

}

export abstract class PortOwner extends SlangNode {

    private ports: { in: PortModel | null, out: PortModel | null } = {in: null, out: null};
    protected baseStream: Stream;

    protected constructor() {
        super();
        this.baseStream = new Stream(null, undefined);
        this.baseStream.subscribeReplaced(newStream => this.baseStream = newStream);
    }

    private attachPort(port: PortModel) {
        if (port.getParentNode() !== this) {
            throw `wrong parent ${port.getParentNode().getIdentity()}, should be ${this.getIdentity()}`;
        }

        if (port.isDirectionIn()) {
            this.ports.in = port;
        } else {
            this.ports.out = port;
        }

        port.setStream(this.baseStream);
    }

    protected createPortFromType(P: new(p: PortModel | null, o: PortOwner, tid: TypeIdentifier, d: PortDirection) => PortModel, type: SlangType, direction: PortDirection): PortModel {
        const port = new P(null, this, type.getTypeIdentifier(), direction);

        switch (type.getTypeIdentifier()) {
            case TypeIdentifier.Map:
                for (const [subName, subType] of type.getMapSubs()) {
                    const subPort = this.createPortFromType(P, subType, direction);
                    port.addMapSub(subName, subPort);
                }
                break;
            case TypeIdentifier.Stream:
                port.setStreamSub(this.createPortFromType(P, type.getStreamSub(), direction));
                break;
            case TypeIdentifier.Generic:
                port.setGenericIdentifier(type.getGenericIdentifier());
                break;
        }

        if (port.getParentNode() === this) {
            this.attachPort(port);
        }

        return port;
    }

    public getPortIn(): PortModel | null {
        return this.ports.in;
    }

    public getPortOut(): PortModel | null {
        return this.ports.out;
    }

    public getPorts(): IterableIterator<PortModel> {
        const p: Array<PortModel> = [];
        if (this.ports.in) {
            p.push(this.ports.in);
        }
        if (this.ports.out) {
            p.push(this.ports.out);
        }
        return p.values();
    }

    public getBaseStream(): Stream {
        return this.baseStream;
    }

    public setBaseStream(stream: Stream) {
        this.baseStream = stream;
        stream.subscribeReplaced(newStream => this.baseStream = newStream);
    }

}

export abstract class BlackBox extends PortOwner {

    abstract getDisplayName(): string;

    abstract findDelegate(name: string): DelegateModel | undefined;

    abstract getDelegates(): IterableIterator<DelegateModel>;

}
