import {BehaviorSubject, Subject} from 'rxjs';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlueprintDelegateModel, OperatorDelegateModel} from './delegate';
import {PortOwner, SlangNode} from '../custom/nodes';
import {Connections} from '../custom/connections';

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

export abstract class PortModel extends SlangNode {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    // Properties
    private readonly mapSubPorts: Map<string, PortModel> | undefined;
    private streamSubPort: PortModel | undefined;
    protected destinations: Array<PortModel> | null = null;
    protected owner: PortOwner;

    protected constructor(protected parent: PortModel | null, private type: PortType, private inDirection: boolean) {
        super();
        if (this.type === PortType.Map) {
            this.mapSubPorts = new Map<string, PortModel>();
        }
    }

    protected addMapSubPort(name: string, port: PortModel): PortModel {
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

    protected setStreamSubPort(port: PortModel) {
        if (this.type !== PortType.Stream) {
            throw `set stream sub port of a port of type '${this.type}' not possible`;
        }
        port.parent = this;
        this.streamSubPort = port;
    }

    public getStreamSubPort(): PortModel {
        if (this.type !== PortType.Stream) {
            throw `${this.getIdentity()}: access of stream port of a port of type '${this.type}' not possible`;
        }
        if (!this.streamSubPort) {
            throw `${this.getIdentity()}: stream port not having sub stream port`;
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
        const ownerIdentity: string = this.owner.getIdentity();
        if (this.inDirection) {
            return referenceString + '(' + ownerIdentity;
        } else {
            return ownerIdentity + ')' + referenceString;
        }
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

    // Slang tree

    isClass(className: string): boolean {
        return className === PortModel.name;
    }

    getChildNodes(): IterableIterator<SlangNode> {
        const children: Array<SlangNode> = [];
        switch (this.type) {
            case PortType.Map:
            for (const mapSubPort of this.getMapSubPorts()) {
                children.push(mapSubPort[1]);
            }
            break;
            case PortType.Stream:
                children.push(this.getStreamSubPort());
                break;
        }
        return children.values();
    }

    getParentNode(): SlangNode {
        if (this.parent) {
            return this.parent;
        }
        return this.owner;
    }
}

export class BlueprintPortModel extends PortModel {
    public constructor(parent: PortModel | null, owner: BlueprintModel | BlueprintDelegateModel, type: PortType, inDirection: boolean) {
        super(parent, type, inDirection);
        this.setOwner(owner);
    }

    public addMapSubPort(name: string, port: BlueprintPortModel): BlueprintPortModel {
        return super.addMapSubPort(name, port) as BlueprintPortModel;
    }

    public getMapSubPorts(): IterableIterator<[string, BlueprintPortModel]> {
        return super.getMapSubPorts() as IterableIterator<[string, BlueprintPortModel]>;
    }

    public findMapSubPort(name: string): BlueprintPortModel {
        return super.findMapSubPort(name) as BlueprintPortModel;
    }

    public setStreamSubPort(port: BlueprintPortModel) {
        super.setStreamSubPort(port);
    }

    public getStreamSubPort(): BlueprintPortModel {
        return super.getStreamSubPort() as BlueprintPortModel;
    }

    public isClass(className: string): boolean {
        return super.isClass(className) || className === BlueprintPortModel.name;
    }

    private setOwner(owner: BlueprintModel | BlueprintDelegateModel) {
        this.owner = owner;
        if (this.isDirectionIn()) {
            // Blueprints can have their in-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        }
    }
}

export class OperatorPortModel extends PortModel {
    public constructor(parent: PortModel | null, owner: OperatorModel | OperatorDelegateModel, type: PortType, inDirection: boolean) {
        super(parent, type, inDirection);
        this.setOwner(owner);
    }

    public addMapSubPort(name: string, port: OperatorPortModel): OperatorPortModel {
        return super.addMapSubPort(name, port) as OperatorPortModel;
    }

    public getMapSubPorts(): IterableIterator<[string, OperatorPortModel]> {
        return super.getMapSubPorts() as IterableIterator<[string, OperatorPortModel]>;
    }

    public findMapSubPort(name: string): OperatorPortModel {
        return super.findMapSubPort(name) as OperatorPortModel;
    }

    public setStreamSubPort(port: OperatorPortModel) {
        super.setStreamSubPort(port);
    }

    public getStreamSubPort(): OperatorPortModel {
        return super.getStreamSubPort() as OperatorPortModel;
    }

    public isClass(className: string): boolean {
        return super.isClass(className) || className === OperatorPortModel.name;
    }
    
    private setOwner(owner: OperatorModel | OperatorDelegateModel) {
        this.owner = owner;
        if (!this.isDirectionIn()) {
            // Operators can have their out-ports connected with operator in-ports or blueprint out-ports
            this.destinations = [];
        }
    }
}
