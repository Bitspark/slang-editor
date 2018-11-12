import {GenericPortModel, PortDirection, PortModel, PortModelArgs} from '../model/port';
import {DelegateModel} from "../model/delegate";
import {SlangType, TypeIdentifier} from "./type";
import {SlangSubject} from './events';

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
    private children = new Map<string, SlangNode>();
    private lastId = "0";
    private childCreated = new Map<Type<SlangNode>, SlangSubject<SlangNode>>();
    
    protected constructor(protected readonly parent: SlangNode | null) {}

    public getIdentity(): string {
        if (this.parent) {
            return this.parent.getIdentity() + "." + this.id;
        } else {
            return "sl";
        }
    }
    
    public findNodeById(id: string): SlangNode | undefined {        
        const thisId = this.getIdentity();
        if (thisId === id) {
            return this;
        }
        
        if (!id.startsWith(thisId)) {
            return undefined;
        }
        
        id = id.substr(thisId.length);
        const idSplit = id.split(".");

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
        return this.children.get(id);
    }

    public getChildNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
        types = getTypes(types);
        const children: Array<T> = [];
        for (const childNode of this.children.values()) {
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
        if (this.children.size === 0) {
            return null;
        }
        for (const childNode of this.children.values()) {
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

    protected createChildNode<T extends SlangNode, A>(ctor: new(parent: SlangNode, args: A) => T, args: A): T {
        const childNode = new ctor(this, args);
        childNode.id = this.nextId();
        this.children.set(childNode.id, childNode);
        this.getSubjectChildCreated(ctor).next(childNode);
        return childNode;
    }
    
    private nextId(): string {
        this.lastId = Number(Number.parseInt(this.lastId, 16) + 1).toString(16);
        return this.lastId;
    }

    // Events
    
    private getSubjectChildCreated<T extends SlangNode>(type: Type<T>): SlangSubject<T> {
        const subject = this.childCreated.get(type);
        if (subject) {
            return subject as SlangSubject<T>;
        } else {
            const subject = new SlangSubject<T>(`${type.name}-created`);
            this.childCreated.set(type, subject);
            return subject;
        }
    }
    
    public subscribeChildCreated<T extends SlangNode>(types: Types<T>, cb: (child: T) => void) {
        for (const type of getTypes(types)) {
            this.getSubjectChildCreated(type).subscribe(cb);
        }
    }
    
}

export abstract class PortOwner extends SlangNode {

    protected createPortFromType(P: new(p: PortModel | PortOwner, args: PortModelArgs) => PortModel, type: SlangType, direction: PortDirection): PortModel {
        const port = this.createChildNode(P, {type: type.getTypeIdentifier(), direction});

        switch (type.getTypeIdentifier()) {
            case TypeIdentifier.Map:
                for (const [subName, subType] of type.getMapSubs()) {
                    port.addMapSub(subName, this.createPortFromType(P, subType, direction));
                }
                break;
            case TypeIdentifier.Stream:
                port.setStreamSub(this.createPortFromType(P, type.getStreamSub(), direction));
                break;
            case TypeIdentifier.Generic:
                port.setGenericIdentifier(type.getGenericIdentifier());
                break;
        }

        return port;
    }

    public getPortIn(): PortModel | null {
        return this.scanChildNode(GenericPortModel, p => p.isDirectionIn()) || null;
    }

    public getPortOut(): PortModel | null {
        return this.scanChildNode(GenericPortModel, p => p.isDirectionOut() ) || null;
    }

    public getPorts(): IterableIterator<PortModel> {
        return this.getChildNodes(GenericPortModel);
    }

}

export abstract class BlackBox extends PortOwner {

    abstract getDisplayName(): string;

    abstract findDelegate(name: string): DelegateModel | undefined;

    abstract getDelegates(): IterableIterator<DelegateModel>;

}
