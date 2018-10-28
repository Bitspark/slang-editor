import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintType, Blackbox, Connections} from './blueprint';
import {OperatorPortModel, PortModel} from './port';
import {DelegateModel, OperatorDelegateModel} from './delegate';

export class OperatorModel implements Blackbox {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    private delegates: Array<OperatorDelegateModel> = [];
    private portIn: OperatorPortModel | null = null;
    private portOut: OperatorPortModel | null = null;

    constructor(private owner: BlueprintModel, private name: string, private blueprint: BlueprintModel) {
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

    public getDelegates(): IterableIterator<DelegateModel> {
        return this.delegates.values();
    }

    public findDelegate(name: string): DelegateModel | undefined {
        return this.delegates.find(delegate => delegate.getName() === name);
    }

    public setPortIn(port: OperatorPortModel) {
        this.portIn = port;
    }

    public setPortOut(port: OperatorPortModel) {
        this.portOut = port;
    }

    public getPortIn(): OperatorPortModel | null {
        return this.portIn;
    }

    public getPortOut(): OperatorPortModel | null {
        return this.portOut;
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
        if (this.portOut) {
            connections.addConnections(this.portOut.getConnections());
        }

        // Then, handle delegate out-ports
        for (const delegate of this.delegates) {
            connections.addConnections(delegate.getConnections());
        }

        return connections;
    }

    // Actions
    public addDelegate(delegate: OperatorDelegateModel): DelegateModel {
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
}
