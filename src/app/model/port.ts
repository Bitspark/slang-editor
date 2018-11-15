import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {PortOwner, SlangNode, StreamType} from "../custom/nodes";
import {Connection, Connections} from "../custom/connections";
import {SlangType, TypeIdentifier} from "../custom/type";
import {SlangBehaviorSubject, SlangSubject} from "../custom/events";

export enum PortDirection {
    In, // 0
    Out, // 1
}

export abstract class GenericPortModel<O extends PortOwner> extends SlangNode {

    // Topics
    // self
    private connected = new SlangSubject<Connection>("connected");
    private disconnected = new SlangSubject<Connection>("disconnected");
    private collapsed = new SlangBehaviorSubject<boolean>("collapsed", false);
    private streamType = new SlangBehaviorSubject<StreamType | null>("streamType", null);

    // Properties
    private readonly name: string;
    private readonly typeIdentifier: TypeIdentifier;
    private readonly direction: PortDirection;
    private genericIdentifier?: string;
    private streamDepth: number = 0;
    protected connectedWith: Array<PortModel> = [];

    protected constructor(parent: GenericPortModel<O> | O, {type, name, direction}: PortModelArgs, P: new(p: PortModel | PortOwner, args: PortModelArgs) => PortModel) {
        super(parent);
        this.name = name;
        this.typeIdentifier = type.getTypeIdentifier();
        this.direction = direction;

        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const [subName, subType] of type.getMapSubs()) {
                    this.createChildNode(P, {name: subName, type: subType, direction});
                }
                break;
            case TypeIdentifier.Stream:
                const subType = type.getStreamSub();
                this.createChildNode(P, {name: "~", type: subType, direction});
                break;
            case TypeIdentifier.Generic:
                this.setGenericIdentifier(type.getGenericIdentifier());
                break;
        }
        
        this.subscribeConnected(connection => {
            // const streamType = this.getStreamType();
            // if (!streamType) {
            //     return;
            // }
			// connection.destination.setStream(streamType);
        });
    }

    public getMapSubs(): IterableIterator<GenericPortModel<O>> {
        if (this.typeIdentifier !== TypeIdentifier.Map) {
            throw new Error(`access of map sub ports of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
        }
        return this.getChildNodes(GenericPortModel);
    }

    public findMapSub(name: string): GenericPortModel<O> {
        if (this.typeIdentifier !== TypeIdentifier.Map) {
            throw new Error(`accessing map sub port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
        }
        const mapSub = this.scanChildNode(GenericPortModel, port => port.getName() === name);
        if (!mapSub) {
            throw new Error(`map sub port '${name}' not found: '${this.getIdentity()}'`);
        }
        return mapSub;
    }

    // public createStreams(baseStreamType: StreamType): void {
    //     if (!this.isSource()) {
	// 		throw new Error(`can only create streams on source ports`);
    //     }
    //    
    //     this.setStream(baseStreamType);
    //    
    //     if (this.typeIdentifier === TypeIdentifier.StreamType) {
    //         const sub = this.getStreamSub();
    //         if (sub) {
    //             sub.createStreams(baseStreamType.createSubStream(sub));
    //         }
    //     } else if (this.typeIdentifier === TypeIdentifier.Map) {
    //         for (const sub of this.getMapSubs()) {
    //             sub.createStreams(baseStreamType);
    //         }
    //     }
    // }
    
    // public trackStreams(): void {
    //     const streamType = this.streamType.getValue();
    //     if (!streamType) {
    //         return;
    //     }
    //    
	// 	if (this.isSource()) {		    
	// 		for (const destination of this.connectedWith) {
	// 			destination.setStream(streamType);
	// 			destination.trackStreams();
	// 		}
    //
	// 		if (this.typeIdentifier === TypeIdentifier.StreamType) {
	// 			const sub = this.getStreamSub();
	// 			if (sub) {
	// 				sub.trackStreams();
	// 			}
	// 		} else if (this.typeIdentifier === TypeIdentifier.Map) {
	// 			for (const sub of this.getMapSubs()) {
	// 				sub.trackStreams();
	// 			}
	// 		}
	// 	} else {
	// 		const owner = this.getAncestorNode(PortOwner);
	// 		if (!owner || !(owner instanceof OperatorModel)) {
	// 			// TODO: Check if correct streamType returned
	// 			console.log(this, "end reached.");
	// 			return;
	// 		}
	//	    
	// 	    owner.trackStreams();
    //     }
    // }
    
    // private setStream(streamType: StreamType): void {
    //     this.streamType.next(streamType);
    //    
    //     const parent = this.getParentNode();
    //     if (!parent) {
    //         throw new Error(`port must have a parent`);
    //     }
    //    
    //     if (parent instanceof GenericPortModel) {
    //         const parentStream = parent.getStreamType();
    //         const baseStreamType = streamType.getBaseStreamType();
	// 		if (baseStreamType !== null) {
	// 			if (parentStream !== null) {
	// 			    if (baseStreamType !== parentStream) {
	// 			        console.error(`streamType types not matching`, baseStreamType, parentStream, this);
	// 			        // throw new Error(`streamType types not matching`);
    //                 } else {
	// 			        // Nothing to do
    //                 }
	// 			} else {
	// 			    parent.setStream(baseStreamType);
	// 			}
	// 		} else {
	// 			if (parentStream !== null) {
	// 				console.error(`target streamType depth too high`, baseStreamType, parentStream, this, this.isDirectionIn());
	// 			    // throw new Error(`target streamType depth too high`);
	// 			} else {
	// 			    // Nothing to go, bottom reached
	// 			}
	// 		}
    //     } else if (parent instanceof PortOwner) {            
    //         parent.setBaseStreamType(streamType);
    //        
    //         if (this.isSource()) {
    //             parent.trackStreams();
    //         }
    //     }
    // }

    public getStreamType(): StreamType | null {
        return this.streamType.getValue();
    }
    
    private setSubStreams(baseStreamType: StreamType): void {
		this.streamType.next(baseStreamType);
		
		if (this.typeIdentifier === TypeIdentifier.Stream) {
			const sub = this.getStreamSub();
			if (sub) {
				sub.setSubStreams(baseStreamType.createSubStream(sub));
			}
		} else if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.getMapSubs()) {
				sub.setSubStreams(baseStreamType);
			}
		}
    }
    
    public createStream(): StreamType {
        if (!this.isSource()) {
			throw new Error(`can only create streams on source ports`);
        }
        
        const parent = this.getParentNode();
        if (!(parent instanceof PortOwner)) {
            throw new Error(`can only create streams on topmost ports`);
        }
		
        const baseStreamType = new StreamType(null, this);
        this.setSubStreams(new StreamType(null, this));
        return baseStreamType;
    }
    
    // private setStreamDepth(depth: number): void {
    //     this.streamDepth = depth;
    //     const sub = this.getStreamSub();
    //     if (sub) {
    //         sub.setStreamDepth(depth + 1);
    //     }
    //     for (const sub of this.getMapSubs()) {
    //         sub.setStreamDepth(depth);
    //     }
    // }

    public getStreamSub(): GenericPortModel<O> {
        if (this.typeIdentifier !== TypeIdentifier.Stream) {
            throw new Error(`accessing stream port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
        }
        const streamSub = this.getChildNode(GenericPortModel);
        if (!streamSub) {
            throw new Error(`stream port not having sub stream port: '${this.getIdentity()}'`);
        }
        return streamSub;
    }

    public setGenericIdentifier(genericIdentifier: string) {
        if (this.typeIdentifier !== TypeIdentifier.Generic) {
            throw new Error(`set generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
        }
        this.genericIdentifier = genericIdentifier;
    }

    public getGenericIdentifier(): string {
        if (this.typeIdentifier !== TypeIdentifier.Generic) {
            throw new Error(`accessing of generic identifier of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
        }
        if (!this.genericIdentifier) {
            throw new Error(`generic port requires a generic identifier`);
        }
        return this.genericIdentifier;
    }

    public getType(): SlangType {
        const type = new SlangType(null, this.typeIdentifier);
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const subPort of this.getMapSubs()) {
                    type.addMapSub(subPort.getName(), subPort.getType());
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
        return this.name;
    }
    
    public getStreamDepth(): number {
        return this.streamDepth;
    }

    private gitDirectConnectionsTo(): Connections {
        const connections = new Connections();
        for (const connectedWith of this.connectedWith) {
            if (this.isSource()) {
                connections.addConnection({source: this, destination: connectedWith});
            }
        }
        return connections;
    }
    
    public getConnectionsTo(): Connections {
        const connections = this.gitDirectConnectionsTo();
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                const mapSubs = this.getMapSubs();
                let noMapSubs = true;
                for (const mapSub of mapSubs) {
                    connections.addConnections(mapSub.getConnectionsTo());
                    noMapSubs = false;
                }
                if (noMapSubs) {
                    throw new Error(`map port without map sub ports`);
                }
                break;
            case TypeIdentifier.Stream:
                const streamSub = this.getStreamSub();
                if (!streamSub) {
                    throw new Error(`stream port without stream sub port`);
                }
                connections.addConnections(streamSub.getConnectionsTo());
                break;
        }
        return connections;
    }

    private getPortReference(): string {
        const parent = this.getParentNode();
        if (!(parent instanceof GenericPortModel)) {
            return '';
        }
        const parentRefString = parent.getPortReference();
        if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
            if (parentRefString === '') {
                return this.getName();
            }
            return parentRefString + '.' + this.getName();
        } else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
            if (parentRefString === '') {
                return '~';
            }
            return parentRefString + '.~';
        }
        return parentRefString;
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
    
    public disconnectTo(destination: PortModel) {
        if (!this.isSource()) {
            throw new Error(`can only disconnect source ports`);
        }

        const connection = {source: this, destination: destination};
        
        const idxS = this.connectedWith.indexOf(destination);
        if (idxS === -1) {
            throw new Error(`not connected with that port`);
        }
        this.connectedWith.splice(idxS, 1);
        this.disconnected.next(connection);
        
        const idxT = destination.connectedWith.indexOf(this);
        if (idxT === -1) {
            throw new Error(`inconsistency: not connected with that port`);
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
            throw new Error(`cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`);
        }
        switch (this.typeIdentifier) {
            case TypeIdentifier.Map:
                for (const subPort of this.getMapSubs()) {
                    subPort.connectTo(destination.findMapSub(subPort.getName()));
                }
                break;
            case TypeIdentifier.Stream:
                this.getStreamSub().connectTo(destination.getStreamSub());
                break;
            default:
                const connection = {source: this, destination: destination};
                destination.connectedWith.push(this);
				this.connectedWith.push(destination);
                destination.connected.next(connection);
				this.connected.next(connection);
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

    public subscribeCollapsed(cb: (collapsed: boolean) => void): void {
        this.collapsed.subscribe(cb);
    }
    
    public subscribeConnected(cb: (connection: Connection) => void): void {
        this.gitDirectConnectionsTo().forEach(connection => {
            cb(connection);
        });
        this.connected.subscribe(cb);
    }

    public subscribeDisconnected(cb: (connection: Connection) => void): void {
        this.disconnected.subscribe(cb);
    }
    
    public subscribeStreamTypeChanged(cb: (streamType: StreamType | null) => void): void {
        this.streamType.subscribe(cb);
    }
}

export type PortModel = GenericPortModel<PortOwner>;

export type PortModelArgs = {name: string, type: SlangType, direction: PortDirection};

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
    public constructor(parent: BlueprintModel | BlueprintDelegateModel | BlueprintPortModel, args: PortModelArgs) {
        super(parent, args, BlueprintPortModel);
    }

    public isSource(): boolean {
        return this.isDirectionIn();
    }
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
    public constructor(parent: OperatorModel | OperatorDelegateModel | OperatorPortModel, args: PortModelArgs) {
        super(parent, args, OperatorPortModel);
    }

    public isSource(): boolean {
        return this.isDirectionOut();
    }
}