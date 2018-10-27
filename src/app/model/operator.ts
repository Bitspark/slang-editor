import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintOrOperator, BlueprintType} from "./blueprint";
import {PortModel} from "./port";

export class OperatorModel implements BlueprintOrOperator {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    constructor(private name: string, private blueprint: BlueprintModel, private portIn: PortModel | null, private portOut: PortModel | null) {
        if (portIn) {
            portIn.setOwner(this);
        }
        if (portOut) {
            portOut.setOwner(this);
        }
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
