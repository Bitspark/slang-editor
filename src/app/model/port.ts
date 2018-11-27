import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {BlackBox, PortOwner, SlangNode} from "../custom/nodes";
import {Connection, Connections} from "../custom/connections";
import {SlangType, TypeIdentifier} from "../custom/type";
import {SlangBehaviorSubject, SlangSubject} from "../custom/events";
import {StreamPort} from "../custom/stream";
import {canConnectTo} from "../custom/connection-check";
import {GenericSpecifications} from "../custom/generics";

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

	// Properties
	private readonly name: string;
	private readonly direction: PortDirection;
	private readonly generics: GenericSpecifications | null;
	private readonly ghost: boolean;
	private typeIdentifier: TypeIdentifier = TypeIdentifier.Generic;
	private genericIdentifier?: string;
	private streamDepth: number = 0;
	protected connectedWith: Array<PortModel> = [];

	// Mixins
	private streamPort!: StreamPort;

	protected constructor(parent: GenericPortModel<O> | O, {type, name, direction, generics}: PortModelArgs, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel) {
		super(parent);
		this.name = name;
		this.direction = direction;
		this.generics = generics;
		this.ghost = type.isGeneric();

		this.constructPort(type, P, direction, generics);
		
		if (this.isDestination()) {
			this.subscribeConnected(connection => {
				this.connectedWith.push(connection.source);
			});

			this.subscribeDisconnected(connection => {
				const idxS = this.connectedWith.indexOf(connection.source);
				if (idxS === -1) {
					throw new Error(`not connected with that port`);
				}
				this.connectedWith.splice(idxS, 1);
			});
		}

		if (this.isSource()) {
			this.subscribeConnected(connection => {
				this.connectedWith.push(connection.destination);
			});

			this.subscribeDisconnected(connection => {
				const idxT = this.connectedWith.indexOf(connection.destination);
				if (idxT === -1) {
					throw new Error(`inconsistency: not connected with that port`);
				}
				this.connectedWith.splice(idxT, 1);
			});
		}
		
		if (this.ghost && generics) {
			generics.subscribeGenericTypeChanged(this.genericIdentifier!, type => {
				this.rebuildGeneric(type, P);
			});
		}

		this.subscribeDisconnected(() => {
			if (this.connectedWith.length === 0) {
				if (this.ghost && this.generics) {
					this.generics.specify(this.genericIdentifier!, new SlangType(null, TypeIdentifier.Unspecified));
				}
			}
		});
	}
	
	private rebuildGeneric(type: SlangType | null, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel): void {
		if (!type) {
			return;
		}
		this.constructPort(type, P, this.direction, null);
	}
	
	private constructPort(type: SlangType, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel, direction: PortDirection, generics: GenericSpecifications | null): void {
		this.typeIdentifier = type.getTypeIdentifier();
		this.streamPort = new StreamPort(this);
		
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of type.getMapSubs()) {
					this.createChildNode(P, {name: subName, type: subType, direction, generics});
				}
				break;
			case TypeIdentifier.Stream:
				const subType = type.getStreamSub();
				this.createChildNode(P, {name: "~", type: subType, direction, generics});
				break;
			case TypeIdentifier.Generic:
				const identifier = type.getGenericIdentifier();
				this.setGenericIdentifier(identifier);
				break;
		}

		this.streamPort.initialize();
	}
	
	public isGhostGeneric(): boolean {
		return this.ghost;
	}

	public getConnectedWith(): IterableIterator<PortModel> {
		return this.connectedWith.values();
	}

	public getStreamPort(): StreamPort {
		return this.streamPort;
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

	public getOwner(): O {
		const owner = this.getAncestorNode(PortOwner);
		if (!owner) {
			throw new Error(`port without owner detected`);
		}
		return owner as O;
	}

	public isParentStreamOrOwner(): boolean {
		const parent = this.getParentNode();
		return !(parent instanceof GenericPortModel) || parent.typeIdentifier === TypeIdentifier.Stream;
	}

	public getStreamParent(): GenericPortModel<O> {
		if (this.isParentStreamOrOwner()) {
			return this;
		}
		return this.getParentNode() as GenericPortModel<O>;
	}

	public toString(): string {
		return this.getIdentity() + "_" + PortDirection[this.getDirection()];
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

	public getDescendantPorts(): Array<GenericPortModel<O>> {
		const ports: Array<GenericPortModel<O>> = [this];
		if (this.typeIdentifier == TypeIdentifier.Map) {
			const subs = this.getMapSubs();
			for (const sub of subs) {
				ports.push.apply(ports, sub.getDescendantPorts());
			}
		} else if (this.typeIdentifier == TypeIdentifier.Stream) {
			const sub = this.getStreamSub();
			if (sub) {
				ports.push.apply(ports, sub.getDescendantPorts());
			}
		}
		return ports;
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

	public abstract isSource(): boolean;

	public isDestination(): boolean {
		return !this.isSource();
	}

	public disconnectTo(destination: PortModel) {
		if (!this.isSource()) {
			throw new Error(`can only disconnect source ports`);
		}

		const connection = {source: this, destination: destination};
		this.disconnected.next(connection);
		destination.disconnected.next(connection);
	}

	/**
	 * Connects this port to the destination port.
	 * This has to be a source port and destination a destination port.
	 * @param destination
	 */
	private connectTo(destination: PortModel) {
		if (!canConnectTo(this, destination)) {
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
				destination.connected.next(connection);
				this.connected.next(connection);
				break;
		}
	}

	public canConnect(other: PortModel): boolean {
		if (this.isSource()) {
			return canConnectTo(this, other);
		} else {
			return canConnectTo(other, this);
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
}

export type PortModel = GenericPortModel<PortOwner>;

export type PortModelArgs = { name: string, type: SlangType, direction: PortDirection, generics: GenericSpecifications | null, };

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