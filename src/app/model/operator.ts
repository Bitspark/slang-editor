import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, PortOwner, BlueprintType} from "./blueprint";
import {PortModel} from "./port";
import {DelegateModel} from "./delegate";

export class OperatorModel implements PortOwner {

    // Topics
    // self
    private removed = new Subject<void>();
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;
    private selected = new BehaviorSubject<boolean>(false);

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
        return this.blueprint.getDelegates();
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
