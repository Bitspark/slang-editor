import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, PortOwner, BlueprintType, Operator} from "./blueprint";
import {PortModel} from "./port";
import {DelegateModel} from "./delegate";

export class OperatorModel implements Operator {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    private delegates: Array<DelegateModel> = [];
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;

    constructor(private name: string, private blueprint: BlueprintModel) {
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

    public setPortIn(port: PortModel) {
        this.portIn = port;
    }

    public setPortOut(port: PortModel) {
        this.portOut = port;
    }

    public getPortIn(): PortModel | null {
        return this.portIn;
    }

    public getPortOut(): PortModel | null {
        return this.portOut;
    }

    public getDisplayName(): string {
        return this.blueprint.getFullName();
    }

    public getIdentity(): string {
        return this.getBlueprint().getIdentity() + '#' + this.getName();
    }

    // Actions
    public addDelegate(delegate: DelegateModel): DelegateModel {
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
