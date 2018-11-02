import {PortDirection, PortModel} from '../model/port';
import {DelegateModel} from '../model/delegate';
import {SlangType, TypeIdentifier} from "./type";

type Type<T> = Function & { prototype: T }

export abstract class SlangNode {

    abstract getChildNodes(): IterableIterator<SlangNode>

    abstract getParentNode(): SlangNode | null

    getAncestorNode<T extends SlangNode>(...types: Array<Type<T>>): T | undefined {
        if (types.length === 0) {
            return undefined;
        }
        for (const t of types) {
            if (this instanceof t) {
                return this as any;
            }
        }
        if (!this.getParentNode()) {
            return undefined;
        }
        return this.getParentNode()!.getAncestorNode<T>(...types);
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
                }
            }
            children.push.apply(children, childNode.getDescendentNodes<T>(...types));
        }
        return children.values();
    }

    abstract getIdentity(): string

}

export abstract class PortOwner extends SlangNode {
    private ports: { in: PortModel | null, out: PortModel | null } = {in: null, out: null};

    private attachPort(port: PortModel) {
        if (port.getParentNode() !== this) {
            throw `wrong parent ${port.getParentNode().getIdentity()}, should be ${this.getIdentity()}`;
        }

        if (port.isDirectionIn()) {
            this.ports.in = port;
        } else {
            this.ports.out = port;
        }
    }

    protected createPortFromType(P: new(p: PortModel | null, o: PortOwner, tid: TypeIdentifier, d: PortDirection) => PortModel, type: SlangType, direction: PortDirection): PortModel {
        const port = new P(null, this, type.getTypeIdentifier(), direction);

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
            p.push(this.ports.out)
        }
        return p.values();
    }
}

export abstract class BlackBox extends PortOwner {
    abstract getDisplayName(): string

    abstract findDelegate(name: string): DelegateModel | undefined

    abstract getDelegates(): IterableIterator<DelegateModel>
}