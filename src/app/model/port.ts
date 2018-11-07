import {BehaviorSubject, Subject} from 'rxjs';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlueprintDelegateModel, OperatorDelegateModel} from './delegate';
import {PortOwner, SlangNode} from '../custom/nodes';
import {Connection, Connections} from '../custom/connections';
import {SlangType, TypeIdentifier} from '../custom/type';

export enum PortDirection {
    In, // 0
    Out, // 1
}

export abstract class GenericPortModel<O extends PortOwner> extends SlangNode {

    // Topics
    // self
    private removed = new Subject<void>();
    private connected = new Subject<Connection>();
    private disconnected = new Subject<Connection>();
    private selected = new BehaviorSubject<boolean>(false);
    private collapsed = new BehaviorSubject<boolean>(false);

    // Properties
    private readonly mapSubs: Map<string, GenericPortModel<O>> | undefined;
    private genericIdentifier?: string;
    private streamSub: GenericPortModel<O> | undefined;
    protected connectedWith: Array<PortModel> = [];
    protected owner: O;

    protected constructor(private parent: GenericPortModel<O> | null, private typeIdentifier: TypeIdentifier, private direction: PortDirection) {
        super();
        if (this.typeIdentifier === TypeIdentifier.Map) {
            this.mapSubs = new Map<string, GenericPortModel<O>>();
        }
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public addMapSub(name: string, port: GenericPortModel<O>): GenericPortModel<O> {
        if (this.typeIdentifier !== TypeIdentifier.Map) {
            throw `add map sub port to a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        this.mapSubs!.set(name, port);
        port.parent = this;
        return this;
    }

    public getMapSubs(): IterableIterator<[string, GenericPortModel<O>]> {
        if (this.typeIdentifier !== TypeIdentifier.Map) {
            throw `access of map sub ports of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        return this.mapSubs!.entries();
    }

    public findMapSub(name: string): GenericPortModel<O> {
        if (this.typeIdentifier !== TypeIdentifier.Map) {
            throw `accessing map sub port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        const mapSub = this.mapSubs!.get(name);
        if (!mapSub) {
            throw `map sub port '${name}' not found: '${this.getIdentity()}'`
        }
        return mapSub;
    }

    public setStreamSub(port: GenericPortModel<O>) {
        if (this.typeIdentifier !== TypeIdentifier.Stream) {
            throw `set stream sub port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        port.parent = this;
        this.streamSub = port;
    }

    public getStreamSub(): GenericPortModel<O> {
        if (this.typeIdentifier !== TypeIdentifier.Stream) {
            throw `accessing stream port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        if (!this.streamSub) {
            throw `stream port not having sub stream port: '${this.getIdentity()}'`;
        }
        return this.streamSub;
    }

    public setGenericIdentifier(genericIdentifier: string) {
        if (this.typeIdentifier !== TypeIdentifier.Generic) {
            throw `set generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        this.genericIdentifier = genericIdentifier;
    }

    public getGenericIdentifier(): string {
        if (this.typeIdentifier !== TypeIdentifier.Generic) {
            throw `accessing of generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`;
        }
        if (!this.genericIdentifier) {
            throw `generic port requires a generic identifier`;
        }
        return this.genericIdentifier;
    }

    public getType(): SlangType {
        const type = new SlangType(null, this.typeIdentifier);
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const [subName, subPort] of this.getMapSubs()) {
                    type.addMapSub(subName, subPort.getType());
                }
                break;
            case TypeIdentifier.Stream:
                type.setStreamSub(this.getStreamSub().getType());
                break;
            case TypeIdentifier.Generic:
                type.setGenericIdentifier(this.getGenericIdentifier());
                break;
        }
        return type;
    }

    public getTypeIdentifier(): TypeIdentifier {
        return this.typeIdentifier;
    }

    public getName(): string {
        if (!this.parent || this.parent.getTypeIdentifier() !== TypeIdentifier.Map) {
            throw `not a map entry`;
        }

        for (const entry of this.parent.getMapSubs()) {
            if (entry[1] === this) {
                return entry[0];
            }
        }
        throw `entry not found`;
    }

    public getConnectionsTo(): Connections {
        const connections = new Connections();
        for (const connectedWith of this.connectedWith) {
            if (this.isSource()) {
                connections.addConnection({source: this, destination: connectedWith});
            }
        }
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                const mapSubs = this.getMapSubs();
                let noMapSubs = true;
                for (const mapSub of mapSubs) {
                    connections.addConnections(mapSub[1].getConnectionsTo());
                    noMapSubs = false;
                }
                if (noMapSubs) {
                    throw `map port without map sub ports`;
                }
                break;
            case TypeIdentifier.Stream:
                const streamSub = this.getStreamSub();
                if (!streamSub) {
                    throw `stream port without stream sub port`;
                }
                connections.addConnections(streamSub.getConnectionsTo());
                break;
        }
        return connections;
    }

    private getPortReference(): string {
        if (!this.parent) {
            return '';
        }
        const parentRefString = this.parent.getPortReference();
        if (this.parent.getTypeIdentifier() === TypeIdentifier.Map) {
            if (parentRefString === '') {
                return this.getName();
            }
            return parentRefString + '.' + this.getName();
        } else if (this.parent.getTypeIdentifier() === TypeIdentifier.Stream) {
            if (parentRefString === '') {
                return '~';
            }
            return parentRefString + '.~';
        }
        return parentRefString;
    }

    public getIdentity(): string {
        const portReference = this.getPortReference();
        const ownerIdentity: string = this.owner.getIdentity();
        switch (this.direction) {
            case PortDirection.In:
                return portReference + '(' + ownerIdentity;
            case PortDirection.Out:
                return ownerIdentity + ')' + portReference;
        }
    }

    public getDirection(): PortDirection {
        return this.direction;
    }

    public isDirectionIn(): boolean {
        return this.direction === PortDirection.In;
    }

    public isDirectionOut(): boolean {
        return this.direction === PortDirection.Out;
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
    
    public collapse(): void {
        if (this.getType().getTypeIdentifier() !== TypeIdentifier.Map) {
            return;
        }
        if (!this.collapsed.getValue()) {
            this.collapsed.next(true);
        }
    }

    public expand(): void {
        if (this.collapsed.getValue()) {
            this.collapsed.next(false);
        }
    }
    
    public isCollapsed(): boolean {
        return this.collapsed.getValue();
    }

    /**
     * Checks if a connection from this port is possible to the destination port.
     * This has to be a source port and destination a destination port (will be checked inside function).
     * @param destination port
     */
    private canConnectTo(destination: PortModel): boolean {
        if (!this.isSource() || destination.isSource()) {
            return false;
        }
        if (destination.connectedWith.length !== 0) {
            return false;
        }
        if (this.connectedWith.indexOf(destination) !== -1) {
            return false;
        }
        if (destination.connectedWith.indexOf(this) !== -1) {
            throw new Error(`${this.getIdentity()}: asymmetric connection found`);
        }
        return this.getType().compatibleTo(destination.getType());
    }
    
    public abstract isSource(): boolean;
    
    public disconnect(destination: PortModel) {
        const connection = {source: this, destination: destination};
        
        const idxS = this.connectedWith.indexOf(destination);
        if (idxS === -1) {
            throw `not connected with that port`;
        }
        this.connectedWith.splice(idxS, 1);
        this.disconnected.next(connection);
        
        const idxT = destination.connectedWith.indexOf(this);
        if (idxT === -1) {
            throw `not connected with that port`;
        }
        destination.connectedWith.splice(idxT, 1);
        destination.disconnected.next(connection);
    }

    /**
     * Connects this port to the destination port.
     * This has to be a source port and destination a destination port.
     * @param destination
     */
    private connectTo(destination: PortModel) {
        if (!this.canConnectTo(destination)) {
            throw `cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`;
        }
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const [subName, subPort] of this.getMapSubs()) {
                    subPort.connectTo(destination.findMapSub(subName));
                }
                break;
            case TypeIdentifier.Stream:
                this.getStreamSub().connectTo(destination.getStreamSub());
                break;
            default:
                const connection = {source: this, destination: destination};
                this.connectedWith.push(destination);
                this.connected.next(connection);
                destination.connectedWith.push(this);
                destination.connected.next(connection);
                break;
        }
    }
        
    public canConnect(other: PortModel): boolean {
        if (this.isSource()) {
            return this.canConnectTo(other);
        } else {
            return other.canConnectTo(this);
        }
    }
    
    public connect(other: PortModel) {
        if (this.isSource()) {
            this.connectTo(other);
        } else {
            other.connectTo(this);
        }
    }

    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }

    public subscribeCollapsed(cb: (collapsed: boolean) => void): void {
        this.collapsed.subscribe(cb);
    }
    
    public subscribeConnected(cb: (connection: Connection) => void): void {
        this.connected.subscribe(cb);
    }

    public subscribeDisconnected(cb: (connection: Connection) => void): void {
        this.disconnected.subscribe(cb);
    }

    // Slang tree
    public getChildNodes(): IterableIterator<SlangNode> {
        const children: Array<SlangNode> = [];
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const mapSub of this.getMapSubs()) {
                    children.push(mapSub[1]);
                }
                break;
            case TypeIdentifier.Stream:
                children.push(this.getStreamSub());
                break;
        }
        return children.values();
    }

    public getParentNode(): SlangNode {
        if (this.parent) {
            return this.parent;
        }
        return this.owner;
    }
}

export type PortModel = GenericPortModel<PortOwner>;

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
    public constructor(parent: GenericPortModel<BlueprintModel | BlueprintDelegateModel> | null, owner: BlueprintModel | BlueprintDelegateModel, type: TypeIdentifier, direction: PortDirection) {
        super(parent, type, direction);
        this.owner = owner;
    }

    public isSource(): boolean {
        return this.isDirectionIn();
    }
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
    public constructor(parent: GenericPortModel<OperatorModel | OperatorDelegateModel> | null, owner: OperatorModel | OperatorDelegateModel, type: TypeIdentifier, direction: PortDirection) {
        super(parent, type, direction);
        this.owner = owner;
    }

    public isSource(): boolean {
        return this.isDirectionOut();
    }
}