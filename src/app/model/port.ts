import {BehaviorSubject, Subject} from 'rxjs';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlueprintDelegateModel, OperatorDelegateModel} from './delegate';
import {PortOwner, SlangNode} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType, TypeModel} from "./type";

abstract class GenericPortModel<O extends PortOwner> extends TypeModel {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    // Properties
    protected destinations: Array<PortModel> | null = null;
    protected owner: O;

    protected constructor(parent: GenericPortModel<O> | null, type: SlangType, private inDirection: boolean) {
        super(parent, type);
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public getMapSubs(): IterableIterator<[string, GenericPortModel<O>]> {
        return (super.getMapSubs() as IterableIterator<[string, GenericPortModel<O>]>);
    }

    public findMapSub(name: string): GenericPortModel<O> {
        return (super.findMapSub(name) as GenericPortModel<O>);
    }

    public getStreamSub(): GenericPortModel<O> {
        return (super.getStreamSub() as GenericPortModel<O>);
    }

    public getConnections(): Connections {
        if (!this.destinations) {
            throw `does not have connections`;
        }
        const connections = new Connections();
        for (const destination of this.destinations) {
            connections.addConnection({source: this, destination: destination});
        }
        switch (this.type) {
            case SlangType.Map:
                const mapSubs = this.getMapSubs();
                let noMapSubs = true;
                for (const mapSub of mapSubs) {
                    connections.addConnections(mapSub[1].getConnections());
                    noMapSubs = false;
                }
                if (noMapSubs) {
                    throw `map port without map sub ports`;
                }
                break;
            case SlangType.Stream:
                const streamSub = this.getStreamSub();
                if (!streamSub) {
                    throw `stream port without stream sub port`;
                }
                connections.addConnections(streamSub.getConnections());
                break;
        }
        return connections;
    }

    public getIdentity(): string {
        const ownerIdentity: string = this.owner.getIdentity();
        if (this.inDirection) {
            return super.getIdentity() + '(' + ownerIdentity;
        } else {
            return ownerIdentity + ')' + super.getIdentity();
        }
    }

    public isDirectionIn(): boolean {
        return this.inDirection;
    }

    // Actions

    public select() {
        if (!this.selected.getValue()) {
            this.selected.next(true);
        }
    }

    public deselect() {
        if (this.selected.getValue()) {
            this.selected.next(false);
        }
    }

    public delete() {
        this.removed.next();
    }

    public connect(destination: GenericPortModel<O>) {
        if (!this.destinations) {
            throw `cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`;
        }
        if (this.destinations.indexOf(destination) !== -1) {
            throw `already connected with that destination`;
        }
        switch (this.type) {
            case SlangType.Map:
                for (const Sub of this.getMapSubs()) {
                    Sub[1].connect(destination.findMapSub(Sub[0]));
                }
                break;
            case SlangType.Stream:
                this.getStreamSub().connect(destination.getStreamSub());
                break;
            default:
                this.destinations.push(destination);
                break;
        }
    }

    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }

    // Slang tree

    getParentNode(): SlangNode {
        const parent = super.getParentNode();
        if (parent) {
            return parent;
        }
        return this.owner;
    }
}

export type PortModel = GenericPortModel<PortOwner>;

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
    public constructor(parent: GenericPortModel<BlueprintModel | BlueprintDelegateModel> | null, owner: BlueprintModel | BlueprintDelegateModel, type: SlangType, inDirection: boolean) {
        super(parent, type, inDirection);

        this.owner = owner;
        if (this.isDirectionIn()) {
            // Blueprints can have their in-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        }
    }
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
    public constructor(parent: GenericPortModel<OperatorModel | OperatorDelegateModel> | null, owner: OperatorModel | OperatorDelegateModel, type: SlangType, inDirection: boolean) {
        super(parent, type, inDirection);

        this.owner = owner;
        if (!this.isDirectionIn()) {
            // Operators can have their out-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        }
    }
}
