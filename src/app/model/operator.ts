import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintType} from './blueprint';
import {OperatorPortModel} from './port';
import {OperatorDelegateModel} from './delegate';
import {BlackBox} from '../custom/nodes';
import {Connections} from '../custom/connections';

export class OperatorModel extends BlackBox {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    private delegates: Array<OperatorDelegateModel> = [];

    constructor(private owner: BlueprintModel, private name: string, private blueprint: BlueprintModel) {
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

    public getDelegates(): IterableIterator<OperatorDelegateModel> {
        return this.delegates.values();
    }

    public findDelegate(name: string): OperatorDelegateModel | undefined {
        return this.delegates.find(delegate => delegate.getName() === name);
    }

    public attachPort(port: OperatorPortModel) {
        super.attachPort(port);
    }

    public getDisplayName(): string {
        return this.blueprint.getFullName();
    }

    public getIdentity(): string {
        return this.owner.getIdentity() + '#' + this.getName();
    }

    public getConnections(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        const portOut = this.getPortOut();
        if (portOut) {
            connections.addConnections(portOut.getConnections());
        }

        // Then, handle delegate out-ports
        for (const delegate of this.delegates) {
            connections.addConnections(delegate.getConnections());
        }

        return connections;
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
