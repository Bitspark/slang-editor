import {GenericPortModel, PortDirection, PortModel, PortModelArgs} from '../model/port';
import {DelegateModel} from "../model/delegate";
import {SlangType, TypeIdentifier} from "./type";

type Type<T> = Function & { prototype: T };

export type SlangToken = {token: string, id: string};

export type Types<T> = [Type<T>, ...Array<Type<T>>];

export abstract class SlangNode {

    private static creationToken = "";
    
    protected static createRoot<T extends SlangNode, A>(ctor: new(token: SlangToken, args: A) => T, args: A): T {
        SlangNode.creationToken = SlangNode.createToken();
        return new ctor({token: SlangNode.creationToken, id: "root"}, args);
    }
    
    private readonly id: string;
    private children = new Map<string, SlangNode>();
    private lastId = "0";
    private lastToken: string = "";
    
    protected constructor(protected readonly parent: SlangNode | null, token: SlangToken) {
        if (!token) {
            throw new Error(`missing token`);
        }
        if (parent) {
            parent.registerNode(this, token);
        } else {
            if (SlangNode.creationToken !== token.token) {
                throw new Error(`illegal node creation: wrong token`);
            }
        }
        this.id = token.id;
    }

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

    public getRootNode(): SlangNode {
        if (!this.getParentNode()) {
            return this;
        }
        return this.getParentNode()!;
    }

    public getChildNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
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
    
    public scanChildNode<T extends SlangNode>(cb: (child: T) => boolean, types: Types<T>): T | undefined {
        for (const child of this.getChildNodes<T>(types)) {
            if (cb(child)) {
                return child as T;
            }
        }
    }

    public getParentNode(): SlangNode | null {
        return this.parent;
    }

    public getAncestorNode<T extends SlangNode>(types: Types<T>): T | undefined {
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
        return parentNode.getAncestorNode<T>(types);
    }

    public getDescendantNodes<T extends SlangNode>(types: Types<T>): IterableIterator<T> {
        const children: Array<T> = [];
        if (types.length === 0) {
            return children.values();
        }
        for (const childNode of this.getChildNodes<SlangNode>([SlangNode])) {
            for (const t of types) {
                if (childNode instanceof t) {
                    children.push(childNode as T);
                    break;
                }
            }
            for (const descendant of childNode.getDescendantNodes<T>(types)) {
                children.push(descendant);
            }
        }
        return children.values();
    }

    protected createChildNode<T extends SlangNode, A>(ctor: new(parent: SlangNode, token: SlangToken, args: A) => T, args: A): T {
        return new ctor(this, this.createToken(), args);
    }
    
    private registerNode(node: SlangNode, token: SlangToken): void {
        if (token.token !== this.lastToken) {
            throw new Error(`illegal node creation: wrong token`);
        }
        if (token.id !== this.lastId) {
            throw new Error(`illegal node creation: wrong id`);
        }
        this.children.set(token.id, node);
    }

    private static createToken(): string {
        return Number(Math.floor(Math.random() * 10000000)).toString(16);
    }
    
    private nextId(): string {
        this.lastId = Number(Number.parseInt(this.lastId, 16) + 1).toString(16);
        return this.lastId;
    }

    private nextToken(): string {
        this.lastToken = SlangNode.createToken();
        return this.lastToken;
    }

    private createToken(): SlangToken {
        return {token: this.nextToken(), id: this.nextId()};
    }

}

export abstract class PortOwner extends SlangNode {

    protected createPortFromType(P: new(p: PortModel | PortOwner, token: SlangToken, args: PortModelArgs) => PortModel, type: SlangType, direction: PortDirection): PortModel {
        const port = this.createChildNode<PortModel, PortModelArgs>(P, {type: type.getTypeIdentifier(), direction});

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
        return this.scanChildNode<PortModel>(p => p.isDirectionIn(), [GenericPortModel]) || null;
    }

    public getPortOut(): PortModel | null {
        return this.scanChildNode<PortModel>(p => p.isDirectionOut(), [GenericPortModel]) || null;
    }

    public getPorts(): IterableIterator<PortModel> {
        return this.getChildNodes<PortModel>([GenericPortModel]);
    }

}

export abstract class BlackBox extends PortOwner {

    abstract getDisplayName(): string;

    abstract findDelegate(name: string): DelegateModel | undefined;

    abstract getDelegates(): IterableIterator<DelegateModel>;

}
