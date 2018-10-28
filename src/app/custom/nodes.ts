import {PortModel} from '../model/port';
import {DelegateModel} from '../model/delegate';

export abstract class SlangNode {

    abstract isClass(className: string): boolean

    abstract getChildNodes(): IterableIterator<SlangNode>

    abstract getParentNode(): SlangNode | null

    getAncestorNode<T extends SlangNode>(classNames: Array<string>): T | undefined {
        console.log(this, classNames);
        if (!classNames.every(name => !this.isClass(name))) {
            console.log('RETURN');
            return this as any;
        }
        if (!this.getParentNode()) {
            console.log('NO PARENT');
            return undefined;
        }
        return this.getParentNode()!.getAncestorNode<T>(classNames);
    }

    getDescendentNodes<T extends SlangNode>(className: string): IterableIterator<T> {
        const children: Array<T> = [];
        for (const childNode of this.getChildNodes()) {
            if (childNode.isClass(className)) {
                children.push(childNode as T);
            }
            children.push.apply(children, childNode.getDescendentNodes<T>(className));
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