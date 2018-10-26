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
    private mapSubPorts = new Map<string, PortModel>();
    private streamSubPort: PortModel | undefined;

    constructor(private type: PortType) {
    }

    public addPort(name: string, port: PortModel): PortModel {
        if (this.type !== PortType.Map) {
            throw `add port to a port of type '${this.type}' is not allowed`;
        }
        this.mapSubPorts.set(name, port);
        return this;
    }

    public getPorts(): IterableIterator<[string, PortModel]> {
        return this.mapSubPorts.entries();
    }

    public findPort(name: string): PortModel | undefined {
        if (this.type !== PortType.Map) {
            throw `access port of a port of type '${this.type}' is not allowed`;
        }
        return this.mapSubPorts.get(name);
    }

    public setPort(port: PortModel) {
        if (this.type !== PortType.Stream) {
            throw `set port to a port of type '${this.type}' is not allowed`;
        }
        return this.streamSubPort = port;
    }

    public getPort(): PortModel | undefined {
        if (this.type !== PortType.Stream) {
            throw `set port to a port of type '${this.type}' is not allowed`;
        }
        return this.streamSubPort;
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
