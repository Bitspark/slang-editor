import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintType} from './blueprint';
import {OperatorPortModel, PortDirection} from './port';
import {OperatorDelegateModel} from './delegate';
import {BlackBox} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";

export interface Geometry {
    position: [number, number]
}

export class OperatorModel extends BlackBox {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    private delegates: Array<OperatorDelegateModel> = [];

    constructor(private owner: BlueprintModel, private name: string, private blueprint: BlueprintModel, private geomentry?: Geometry) {
        super();
    }

    public getName(): string {
        return this.name;
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public getType(): BlueprintType {
        return this.blueprint.getType();
    }

    public getBlueprint(): BlueprintModel {
        return this.blueprint;
    }

    public createPort(type: SlangType, direction: PortDirection): OperatorPortModel {
        return super.createPortFromType(OperatorPortModel, type, direction) as OperatorPortModel;
    }

    public getDelegates(): IterableIterator<OperatorDelegateModel> {
        return this.delegates.values();
    }

    public findDelegate(name: string): OperatorDelegateModel | undefined {
        return this.delegates.find(delegate => delegate.getName() === name);
    }

    public getDisplayName(): string {
        return this.blueprint.getShortName();
    }

    public getIdentity(): string {
        return this.owner.getIdentity() + '#' + this.getName();
    }

    public getConnectionsTo(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        const portOut = this.getPortOut();
        if (portOut) {
            connections.addConnections(portOut.getConnectionsTo());
        }

        // Then, handle delegate out-ports
        for (const delegate of this.delegates) {
            connections.addConnections(delegate.getConnectionsTo());
        }

        return connections;
    }

    public get position(): {x: number, y: number} | undefined {
        if (this.geomentry) {
            return {x: this.geomentry.position[0], y: this.geomentry.position[1]};
        }
    }

    // Actions
    public addDelegate(delegate: OperatorDelegateModel): OperatorDelegateModel {
        this.delegates.push(delegate);
        return delegate;
    }

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

    public moveTo(pos: [number, number]) {
        if (this.geomentry) {
            this.geomentry.position = pos;
        } else {
            this.geomentry = {position: pos};
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

    getChildNodes(): IterableIterator<OperatorPortModel | OperatorDelegateModel> {
        const children: Array<OperatorPortModel | OperatorDelegateModel> = Array.from(this.getPorts() as IterableIterator<OperatorPortModel>);
        for (const delegate of this.delegates) {
            children.push(delegate);
        }
        return children.values();
    }

    getParentNode(): BlueprintModel {
        return this.owner;
    }
}
