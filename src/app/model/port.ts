import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, BlueprintType} from "./blueprint";

export enum PortType {
    Number,
    Binary,
    Boolean,
    String,
    Trigger,
    Primitive,
    Generic,
    Stream,
    Map,
}

export class PortModel {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);
    private subPorts = new Map<string, PortModel>();

    constructor(private type: PortType) {
    }

    public addPort(name: string, port: PortModel): PortModel {
        if (this.type !== PortType.Map) {
            throw `You cannot add port to a port of type '${this.type}'.`;
        }
        this.subPorts.set(name, port);
        return this;
    }

    public getPorts(): IterableIterator<[string, PortModel]> {
        return this.subPorts.entries();
    }

    public findPort(name: string): PortModel | undefined {
        if (this.type !== PortType.Map) {
            throw `You cannot access port of a port of type '${this.type}'.`;
        }
        return this.subPorts.get(name);
    }

    public getType(): PortType {
        return this.type;
    }

    public isSelected(): boolean {
        return this.selected.getValue();
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
