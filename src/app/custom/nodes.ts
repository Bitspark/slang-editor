import {PortModel} from '../model/port';
import {DelegateModel} from '../model/delegate';

type Type<T> = Function & { prototype: T }

export abstract class SlangNode {

    abstract isClass(className: string): boolean

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
    abstract getPortIn(): PortModel | null

    abstract getPortOut(): PortModel | null
}

export abstract class BlackBox extends PortOwner {
    abstract getDisplayName(): string

    abstract findDelegate(name: string): DelegateModel | undefined

    abstract getDelegates(): IterableIterator<DelegateModel>
}