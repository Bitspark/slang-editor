import {GenericPortModel, PortModel, PortModelArgs} from '../model/port';
import {DelegateModel} from "../model/delegate";
import {SlangArrayBehaviorSubject, SlangSubject} from "./events";
import {Subscription} from "rxjs";

type Type<T> = Function & { prototype: T };

export type Types<T> = [Type<T>, ...Array<Type<T>>] | Type<T>;

function getTypes<T>(types: Types<T>): [Type<T>, ...Array<Type<T>>] {
    if (types instanceof Array) {
        return types;
    }
    return [types];
}

export abstract class SlangNode {
    
    protected static createRoot<T extends SlangNode, A>(ctor: new(args: A) => T, args: A): T {
        const root = new ctor(args);
        root.id = "root";
        return root;
    }
    
    private id = "";
    private lastId = "0";
    private children = new SlangArrayBehaviorSubject<SlangNode>('children', []);
    
    protected constructor(protected readonly parent: SlangNode | null) {}

    public getIdentity(): string {
        if (this.parent) {
            return this.parent.getIdentity() + "." + this.id;
        } else {
            return "SL";
        }
    }

    public getScopedIdentity(): string {
        return this.id;
    }
    
    public findNodeById(id: string): SlangNode | undefined {        
        const thisId = this.getIdentity();
        if (thisId === id) {
            return this;
        }
        
        if (!id.startsWith(thisId + ".")) {
            return undefined;
        }
        
        const idSplit = id.substr(thisId.length + 1).split(".");

        const child = this.getNodeById(idSplit[0]);
        if (!child) {
            return undefined;
        }
        
        const found = child.findNodeById(id);
        if (found) {
            return found;
        }
        
        return undefined;
    }

    public getNodeById(id: string): SlangNode | undefined {
        return this.children.getNode(id);
    }

    public getChildNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
        types = getTypes(types);
        const children: Array<T> = [];
        for (const childNode of this.children.getNodes()) {
            for (const t of types) {
                if (childNode instanceof t) {
                    children.push(childNode as T);
                    break;
                }
            }
        }
        return children.values();
    }

    public getChildNode<T extends SlangNode>(types: Types<T>): T | null {
        types = getTypes(types);
        if (this.children.size() === 0) {
            return null;
        }
        for (const childNode of this.children.getNodes()) {
            for (const t of types) {
                if (childNode instanceof t) {
                    return childNode as T;
                }
            }
        }
        return null;
    }
        
    public scanChildNode<T extends SlangNode>(types: Types<T>, cb: (child: T) => boolean): T | undefined {
        for (const child of this.getChildNodes(types)) {
            if (cb(child)) {
                return child as T;
            }
        }
    }

    public getParentNode(): SlangNode | null {
        return this.parent;
    }

    public getAncestorNode<T extends SlangNode>(types: Types<T>): T | undefined {
        types = getTypes(types);
        for (const t of types) {
            if (this instanceof t) {
                return this as any;
            }
        }
        const parentNode = this.getParentNode();
        if (!parentNode) {
            return undefined;
        }
        return parentNode.getAncestorNode(types);
    }

    public getDescendantNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
        types = getTypes(types);
        const children: Array<T> = [];
        for (const childNode of this.getChildNodes(SlangNode)) {
            for (const t of types) {
                if (childNode instanceof t) {
                    children.push(childNode as T);
                    break;
                }
            }
            for (const descendant of childNode.getDescendantNodes(types)) {
                children.push(descendant);
            }
        }
        return children.values();
    }

    protected createChildNode<T extends SlangNode, A>(ctor: new(parent: SlangNode, args: A) => T, args: A, cb?: (child: T) => void): T {
        const childNode = new ctor(this, args);
        childNode.id = this.nextId();
        this.children.nextAdd(childNode, cb);
        
        return childNode;
    }
    
    private nextId(): string {
        this.lastId = Number(Number.parseInt(this.lastId, 16) + 1).toString(16);
        return this.lastId;
    }

    // Events
    
    public subscribeChildCreated<T extends SlangNode>(types: Types<T>, cb: (child: T) => void) {
        this.children.subscribeAdded(child => {
            for (const type of getTypes(types)) {
                if (child instanceof type) {
                    cb(child as T);
                }
            }
        });
    }

    public subscribeDescendantCreated<T extends SlangNode>(types: Types<T>, cb: (child: T) => void) {
        this.children.subscribeAdded(child => {
            for (const type of getTypes(types)) {
                if (child instanceof type) {
                    cb(child as T);
                }
            }
            child.subscribeDescendantCreated(types, cb);
        });
    }
    
}

export class Stream {
    private static id = "0";
    private readonly id: string;
    private replaced = new SlangSubject<Stream>('replaced');
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
    
    public createSubStream(sourcePort: PortModel): Stream {
        return new Stream(this, sourcePort);
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
            throw new Error(`stream circle detected: ${stream.id}`);
        }
        if (this.baseStream) {
            if (stream.baseStream) {
                this.baseStream.replace(stream.baseStream);
            }
        }
        this.replaced.next(stream);
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    public subscribeReplaced(cb: (newStream: Stream) => void) {
        this.subscriptions.push(this.replaced.subscribe(cb));
    }

}

export abstract class PortOwner extends SlangNode {

    protected baseStream: Stream;

    protected constructor(parent: SlangNode) {
        super(parent);
        this.baseStream = new Stream(null, undefined);
        this.baseStream.subscribeReplaced(newStream => this.baseStream = newStream);
    }
    
    protected abstract createPort(args: PortModelArgs): PortModel;

    public getPortIn(): PortModel | null {
        return this.scanChildNode(GenericPortModel, p => p.isDirectionIn()) || null;
    }

    public getPortOut(): PortModel | null {
        return this.scanChildNode(GenericPortModel, p => p.isDirectionOut() ) || null;
    }

    public getPorts(): IterableIterator<PortModel> {
        return this.getChildNodes(GenericPortModel);
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
