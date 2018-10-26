import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintOrOperator, BlueprintType} from "./blueprint";
import {PortModel} from "./port";

export class OperatorModel implements BlueprintOrOperator {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    constructor(private name: string, private blueprint: BlueprintModel) {
    }

    public getName(): string {
        return this.name;
    }
    
    public getBlueprintFullName(): string {
        return this.blueprint.getFullName();
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

    getPortIn(): PortModel | null {
        // TODO: Fix this, we need a copy of ports for operators!
        return this.blueprint.getPortIn();
    }

    getPortOut(): PortModel | null {
        // TODO: Fix this, we need a copy of ports for operators!
        return this.blueprint.getPortIn();
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
