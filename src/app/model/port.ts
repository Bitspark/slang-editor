import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {BlackBox, PortOwner, SlangNode} from "../custom/nodes";
import {Connection, Connections} from "../custom/connections";
import {SlangType, TypeIdentifier} from "../custom/type";
import {SlangBehaviorSubject, SlangSubject} from "../custom/events";
import {Subscription} from "rxjs";
import {StreamType} from "../custom/stream";

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
	private readonly streamType: SlangBehaviorSubject<StreamType | null>;
	private readonly streamTypeUnreachable: SlangBehaviorSubject<boolean> = new SlangBehaviorSubject("stream-unreachable", false);

	// Properties
	private readonly name: string;
	private readonly typeIdentifier: TypeIdentifier;
	private readonly direction: PortDirection;
	private genericIdentifier?: string;
	private streamDepth: number = 0;
	protected connectedWith: Array<PortModel> = [];
	
	private connectionSubscriptions = new Map<GenericPortModel<O>, Subscription>();

	protected constructor(parent: GenericPortModel<O> | O, {type, name, direction}: PortModelArgs, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel) {
		super(parent);
		this.name = name;
		this.typeIdentifier = type.getTypeIdentifier();
		this.direction = direction;

		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				this.streamType = parent.streamType;
			} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				// TODO: This streamType always has to have the parent's streamType as baseStream, ensure that
				this.streamType = new SlangBehaviorSubject<StreamType | null>("streamType", null);
			} else {
				throw new Error(`port parents must be either map or stream`);
			}
		} else {
			this.streamType = new SlangBehaviorSubject<StreamType | null>("streamType", null);
		}

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
		
		if (this.isDestination()) {
			this.subscribeConnected(connection => {
				const subscription = connection.source.subscribeStreamTypeChanged(streamType => {
					if (!streamType) {
						return;
					}
					this.setStreamType(streamType);
				});
				this.connectionSubscriptions.set(connection.source, subscription);
			});
			
			this.subscribeDisconnected(connection => {
				const subscription = this.connectionSubscriptions.get(connection.source);
				if (subscription) {
					subscription.unsubscribe();
				}
				
				const stream = this.getStreamType();
				if (stream) {
					stream.getRootStream().collectGarbage();
				}
			});
		}

		if (this.isSource()) {
			this.subscribeConnected(connection => {
				const subscription = connection.destination.subscribeStreamTypeChanged(streamType => {
					if (!streamType) {
						return;
					}
					this.setStreamType(streamType);
				});
				this.connectionSubscriptions.set(connection.source, subscription);
			});
			
			this.subscribeDisconnected(connection => {
				const subscription = this.connectionSubscriptions.get(connection.source);
				if (subscription) {
					subscription.unsubscribe();
				}
			});
		}
		
		this.subscribeCollectGarbage();
	}
	
	protected subscribeCollectGarbage() {
		let subscriptions: Array<Subscription> = [];
		let oldStream: StreamType | null = null;
		
		this.subscribeStreamTypeChanged(stream => {
			if (!stream || oldStream === stream) {
				return;
			}

			oldStream = stream;

			subscriptions.forEach(subscription => subscription.unsubscribe());
			subscriptions.length = 0;
			
			subscriptions.push(stream.subscribeMarkUnreachable(() => {
				this.streamTypeUnreachable.next(true);
			}));

			subscriptions.push(stream.subscribeRemoveUnreachable(() => {
				if (this.isUnreachable()) {
					this.setSubStreamTypes(null);
				}
			}));
		});
	}
	
	public isUnreachable(): boolean {
		return this.streamTypeUnreachable.getValue();
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

	public getStreamType(): StreamType | null {
		return this.streamType.getValue();
	}

	private isParentStreamOrOwner(): boolean {
		const parent = this.getParentNode();
		return !(parent instanceof GenericPortModel) || parent.typeIdentifier === TypeIdentifier.Stream;
	}

	public setSubStreamTypes(baseStreamType: StreamType | null): void {
		const streamTypeUnreachable = this.isUnreachable();
		this.streamTypeUnreachable.next(false);
		
		if (this.isParentStreamOrOwner()) {
			const oldStream = this.getStreamType();
			if (streamTypeUnreachable) {
				if (!!oldStream && !!baseStreamType && oldStream !== baseStreamType) {
					throw new Error(`unexpected stream change during garbage collection`);
				}
				this.streamType.next(baseStreamType);
			} else {
				if (oldStream === baseStreamType) {
					return;
				}
				this.streamType.next(baseStreamType);
			}
		}

		if (this.typeIdentifier === TypeIdentifier.Stream) {
			const sub = this.getStreamSub();
			if (sub) {
				if (this.isSource()) {
					if (streamTypeUnreachable) {
						sub.setSubStreamTypes(baseStreamType ? sub.getStreamType() : null);
					} else {
						if (baseStreamType) {
							if (baseStreamType.isVirtual()) {
								sub.setSubStreamTypes(baseStreamType.createSubStream(null));
							} else {
								sub.setSubStreamTypes(baseStreamType.createSubStream(sub));
							}
						} else {
							sub.setSubStreamTypes(null);
						}
					}
				} else {
					sub.setSubStreamTypes(baseStreamType ? baseStreamType.createSubStream(null) : null);
				}
			}
		} else if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.getMapSubs()) {
				sub.setSubStreamTypes(baseStreamType);
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
		this.setSubStreamTypes(baseStreamType);
		return baseStreamType;
	}

	public setStreamType(streamType: StreamType): void {
		// Set streams *upwards*

		const streamTypeUnreachable = this.isUnreachable();
		this.streamTypeUnreachable.next(false);
		
		const oldStreamType = this.getStreamType();
		if (streamType === oldStreamType && !streamTypeUnreachable) {
			// Nothing changed
			return;
		}
		if (oldStreamType && !oldStreamType.isVirtual() && !streamTypeUnreachable) {
			// Assert that (streamType !== oldStreamType) in case of reordering if statements!
			throw new Error(`${this.getOwnerName()}: already have different stream type`);
		}

		const parent = this.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.typeIdentifier === TypeIdentifier.Map) {
				parent.setStreamType(streamType);
			} else if (parent.typeIdentifier === TypeIdentifier.Stream) {
				this.streamType.next(streamType);
				const baseStreamType = streamType.getBaseStreamType();
				if (!baseStreamType) {
					throw new Error(`${this.getOwnerName()}: insufficient stream type depth`);
				}
				parent.setStreamType(baseStreamType);
			} else {
				throw new Error(`${this.getOwnerName()}: unexpected port type, cannot be a parent`);
			}
		} else {
			this.streamType.next(streamType);
		}
	}

	public getOwnerName(): string {
		const ownerBox = this.getAncestorNode(BlackBox);
		if (ownerBox) {
			return ownerBox.getDisplayName();
		} else {
			return "unknown";
		}
	}

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

	private getDirectConnectionsTo(): Connections {
		const connections = new Connections();
		for (const connectedWith of this.connectedWith) {
			if (this.isSource()) {
				connections.addConnection({source: this, destination: connectedWith});
			}
		}
		return connections;
	}

	public getDirectConnections(): Connections {
		const connections = new Connections();
		if (this.isSource()) {
			for (const connectedWith of this.connectedWith) {
				connections.addConnection({source: this, destination: connectedWith});
			}
		} else {
			for (const connectedWith of this.connectedWith) {
				connections.addConnection({source: connectedWith, destination: this});
			}
		}
		return connections;
	}

	public getConnectionsTo(): Connections {
		const connections = this.getDirectConnectionsTo();
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
			return "";
		}
		const parentRefString = parent.getPortReference();
		if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
			if (parentRefString === "") {
				return this.getName();
			}
			return parentRefString + "." + this.getName();
		} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
			if (parentRefString === "") {
				return "~";
			}
			return parentRefString + ".~";
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
		if (!this.isSource() || !destination.isDestination()) {
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

	public isDestination(): boolean {
		return !this.isSource();
	}

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
				destination.connected.next(connection);
				this.connectedWith.push(destination);
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
		this.getDirectConnections().forEach(connection => {
			cb(connection);
		});
		this.connected.subscribe(cb);
	}

	public subscribeDisconnected(cb: (connection: Connection) => void): void {
		this.disconnected.subscribe(cb);
	}

	public subscribeStreamTypeChanged(cb: (streamType: StreamType | null) => void): Subscription {
		return this.streamType.subscribe(cb);
	}
	
	public subscribeStreamUnreachableChanged(cb: (unreachable: boolean) => void): Subscription {
		return this.streamTypeUnreachable.subscribe(cb);
	}
}

export type PortModel = GenericPortModel<PortOwner>;

export type PortModelArgs = { name: string, type: SlangType, direction: PortDirection };

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
	public constructor(parent: BlueprintModel | BlueprintDelegateModel | BlueprintPortModel, args: PortModelArgs) {
		super(parent, args, BlueprintPortModel);

		if (parent instanceof BlueprintDelegateModel) {
			parent.subscribeBaseStreamTypeChanged(streamType => {
				this.setSubStreamTypes(streamType);
			});
		}
	}

	public isSource(): boolean {
		return this.isDirectionIn();
	}
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
	public constructor(parent: OperatorModel | OperatorDelegateModel | OperatorPortModel, args: PortModelArgs) {
		super(parent, args, OperatorPortModel);

		if (parent instanceof OperatorModel) {
			parent.subscribeBaseStreamTypeChanged(streamType => {
				this.setSubStreamTypes(streamType);
			});
		}
	}

	public isSource(): boolean {
		return this.isDirectionOut();
	}
}