import {GenericPortModel, PortDirection, PortModel, PortModelArgs} from '../model/port';
import {DelegateModel} from "../model/delegate";
import {SlangType, TypeIdentifier} from "./type";

type Type<T> = Function & { prototype: T };

export type SlangToken = {token: string, id: string};

export abstract class SlangNode {
    
    private readonly id: string;
    private children = new Map<string, SlangNode>();
    private lastId = "0";
    private lastToken: string = "";
    
    protected constructor(protected readonly parent: SlangNode | null = null, token?: SlangToken) {
        if (parent) {
            if (!token) {
                throw new Error(`missing token`);
            }
            parent.registerNode(this, token);
            this.id = token.id;
        }
    }

    public getIdentity(): string {
        if (this.parent) {
            return this.parent.getIdentity() + "." + this.id;
        } else {
            return "sl";
        }
    }

    // TODO: Can be heavily optimized
    public findNode(id: string): SlangNode | undefined {
        if (this.getIdentity() === id) {
            return this;
        }

        for (const child of this.getChildNodes<SlangNode>(SlangNode)) {
            const found = child.findNode(id);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    public getRootNode(): SlangNode {
        if (!this.getParentNode()) {
            return this;
        }
        return this.getParentNode()!;
    }

    public getChildNodes<T extends SlangNode>(...types: Array<Type<T>>): IterableIterator<T> {
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

    public getChildNode<T extends SlangNode>(...types: Array<Type<T>>): T | null {
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
    
    public scanChildNode<T extends SlangNode>(cb: (child: T) => boolean, ...types: Array<Type<T>>): T | undefined {
        for (const child of this.getChildNodes<T>(...types)) {
            if (cb(child)) {
                return child as T;
            }
        }
    }

    public scanChildNodes<T extends SlangNode>(cb: (child: T) => boolean, ...types: Array<Type<T>>): IterableIterator<T> {
        const children: Array<T> = [];
        for (const child of this.getChildNodes<T>(...types)) {
            if (cb(child)) {
                children.push(child as T);
            }
        }
        return children.values();
    }

    public getParentNode(): SlangNode | null {
        return this.parent;
    }

    public getAncestorNode<T extends SlangNode>(...types: Array<Type<T>>): T | undefined {
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

    public getDescendantNodes<T extends SlangNode>(...types: Array<Type<T>>): IterableIterator<T> {
        const children: Array<T> = [];
        if (types.length === 0) {
            return children.values();
        }
        for (const childNode of this.getChildNodes<SlangNode>(SlangNode)) {
            for (const t of types) {
                if (childNode instanceof t) {
                    children.push(childNode as T);
                    break;
                }
            }
            for (const descendant of childNode.getDescendantNodes<T>(...types)) {
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

    private nextId(): string {
        this.lastId = Number(Number.parseInt(this.lastId, 16) + 1).toString(16);
        return this.lastId;
    }

    private nextToken(): string {
        this.lastToken = Number(Math.floor(Math.random() * 100000)).toString(16);
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
        return this.scanChildNode<PortModel>(p => p.isDirectionIn(), GenericPortModel) || null;
    }

    public getPortOut(): PortModel | null {
        return this.scanChildNode<PortModel>(p => p.isDirectionOut(), GenericPortModel) || null;
    }

    public getPorts(): IterableIterator<PortModel> {
        return this.getChildNodes<PortModel>(GenericPortModel);
    }

}

export abstract class BlackBox extends PortOwner {

    abstract getDisplayName(): string;

    abstract findDelegate(name: string): DelegateModel | undefined;

    abstract getDelegates(): IterableIterator<DelegateModel>;

}
