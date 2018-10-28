import {BehaviorSubject, Subject} from "rxjs";
import {BlueprintModel, PortOwner, Connections} from "./blueprint";
import {OperatorModel} from "./operator";
import {DelegateModel} from "./delegate";

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

    // Properties
    private mapSubPorts: Map<string, PortModel> | undefined;
    private streamSubPort: PortModel | undefined;
    private destinations: Array<PortModel> | null;

    constructor(private parent: PortModel | null, private owner: PortOwner, private type: PortType, private inDirection: boolean) {
        if (this.type === PortType.Map) {
            this.mapSubPorts = new Map<string, PortModel>();
        }
        this.setOwner(owner);
    }

    public addMapSubPort(name: string, port: PortModel): PortModel {
        if (this.type !== PortType.Map) {
            throw `add map sub port to a port of type '${this.type}' not possible`;
        }
        this.mapSubPorts!.set(name, port);
        port.parent = this;
        return this;
    }

    public getMapSubPorts(): IterableIterator<[string, PortModel]> {
        if (this.type !== PortType.Map) {
            throw `access of map sub ports of a port of type '${this.type}' not possible`;
        }
        return this.mapSubPorts!.entries();
    }

    public findMapSubPort(name: string): PortModel {
        if (this.type !== PortType.Map) {
            throw `access of map sub port of a port of type '${this.type}' not possible`;
        }
        const mapSubPort = this.mapSubPorts!.get(name);
        if (!mapSubPort) {
            throw `map sub port ${name} not found`
        }
        return mapSubPort;
    }

    public setStreamSubPort(port: PortModel) {
        if (this.type !== PortType.Stream) {
            throw `set stream sub port of a port of type '${this.type}' not possible`;
        }
        port.parent = this;
        this.streamSubPort = port;
    }

    public getStreamSubPort(): PortModel {
        if (this.type !== PortType.Stream) {
            throw `access of stream port of a port of type '${this.type}' not possible`;
        }
        if (!this.streamSubPort) {
            throw `stream port not having sub stream port`;
        }
        return this.streamSubPort;
    }

    public getType(): PortType {
        return this.type;
    }

    public getName(): string {
        if (!this.parent || this.parent.getType() !== PortType.Map) {
            throw `not a map entry`;
        }

        for (const entry of this.parent.getMapSubPorts()) {
            if (entry[1] === this) {
                return entry[0];
            }
        }

        throw `entry not found`;
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public getConnections(): Connections {
        if (!this.destinations) {
            throw `does not have connections`;
        }
        const connections = new Connections();
        for (const destination of this.destinations) {
            connections.addConnection({source: this, destination: destination});
        }
        switch (this.type) {
            case PortType.Map:
                if (!this.mapSubPorts) {
                    throw `map port without map sub ports`;
                }
                for (const mapSubPort of this.mapSubPorts) {
                    connections.addConnections(mapSubPort[1].getConnections());
                }
                break;
            case PortType.Stream:
                if (!this.streamSubPort) {
                    throw `stream port without stream sub port`;
                }
                connections.addConnections(this.streamSubPort.getConnections());
                break;
        }
        return connections;
    }

    private getReferenceString(): string {
        if (!this.parent) {
            return '';
        }
        const parentRefString = this.parent.getReferenceString();
        if (this.parent.getType() === PortType.Map) {
            if (parentRefString === '') {
                return this.getName();
            }
            return parentRefString + '.' + this.getName();
        } else if (this.parent.getType() === PortType.Stream) {
            if (parentRefString === '') {
                return '~';
            }
            return parentRefString + '.~';
        }
        return parentRefString;
    }

    public getIdentity(): string {
        const referenceString = this.getReferenceString();
        const ownerName: string = this.getOwner().getIdentity();
        if (this.inDirection) {
            return referenceString + '(' + ownerName;
        } else {
            return ownerName + ')' + referenceString;
        }
    }

    public setOwner(owner: PortOwner) {
        this.owner = owner;
        switch (this.type) {
            case PortType.Map:
                for (const subPort of this.getMapSubPorts()) {
                    subPort[1].setOwner(owner);
                }
                break;
            case PortType.Stream:
                this.getStreamSubPort().setOwner(owner);
                break;
        }

        const actualOwner: PortOwner = (owner instanceof DelegateModel) ? owner.getOwner() : owner;

        if (actualOwner instanceof BlueprintModel && this.inDirection) {
            // Blueprints can have their in-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        } else if (actualOwner instanceof OperatorModel && !this.inDirection) {
            // Operators can have their out-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        }
    }

    public getOwner(): PortOwner {
        return this.owner;
    }

    public isDirectionIn(): boolean {
        return this.inDirection;
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

    public connect(destination: PortModel) {
        if (!this.destinations) {
            throw `cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`;
        }
        if (this.destinations.indexOf(destination) !== -1) {
            throw `already connected with that destination`;
        }
        switch (this.type) {
            case PortType.Map:
                for (const subPort of this.getMapSubPorts()) {
                    subPort[1].connect(destination.findMapSubPort(subPort[0]));
                }
                break;
            case PortType.Stream:
                this.getStreamSubPort().connect(destination.getStreamSubPort());
                break;
            default:
                this.destinations.push(destination);
                break;
        }
    }

    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }
}
