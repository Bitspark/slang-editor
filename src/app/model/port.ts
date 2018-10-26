import {BehaviorSubject, Subject} from "rxjs";

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
    private mapSubPorts: Map<string, PortModel> | undefined;
    private streamSubPort: PortModel | undefined;
    
    // Properties
    private destinations: Array<PortModel> | undefined;

    constructor(private type: PortType) {
        if (this.type === PortType.Map) {
            this.mapSubPorts = new Map<string, PortModel>();
        }
    }

    public addMapSubPort(name: string, port: PortModel): PortModel {
        if (this.type !== PortType.Map) {
            throw `add map sub port to a port of type '${this.type}' not possible`;
        }
        this.mapSubPorts!.set(name, port);
        return this;
    }

    public getMapSubPorts(): IterableIterator<[string, PortModel]> {
        if (this.type !== PortType.Map) {
            throw `access of map sub ports of a port of type '${this.type}' not possible`;
        }
        return this.mapSubPorts!.entries();
    }

    public findMapSubPort(name: string): PortModel | undefined {
        if (this.type !== PortType.Map) {
            throw `access of map sub port of a port of type '${this.type}' not possible`;
        }
        return this.mapSubPorts!.get(name);
    }

    public setStreamSubPort(port: PortModel) {
        if (this.type !== PortType.Stream) {
            throw `set stream sub port of a port of type '${this.type}' not possible`;
        }
        return this.streamSubPort = port;
    }

    public getStreamSubPort(): PortModel | undefined {
        if (this.type !== PortType.Stream) {
            throw `access of stream port of a port of type '${this.type}' not possible`;
        }
        return this.streamSubPort;
    }

    public getType(): PortType {
        return this.type;
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }
    
    public getDestinations(): IterableIterator<PortModel> | undefined {
        if (!this.destinations) {
            return undefined;
        }
        return this.destinations.values();
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
