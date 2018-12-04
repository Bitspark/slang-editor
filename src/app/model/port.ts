import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {BlackBox, PortOwner, SlangNode} from "../custom/nodes";
import {Connections} from "../custom/connections";
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
	private connected = new SlangSubject<PortModel>("connected");
	private disconnected = new SlangSubject<PortModel>("disconnected");
	private collapsed = new SlangBehaviorSubject<boolean>("collapsed", false);

	// Properties
	private readonly name: string;
	private readonly direction: PortDirection;
	private readonly generics: GenericSpecifications | null = null;
	private typeIdentifier: TypeIdentifier = TypeIdentifier.Generic;
	private genericIdentifier?: string;
	private streamDepth: number = 0;
	protected connectedWith: Array<PortModel> = [];

	// Mixins
	private streamPort!: StreamPort;

	protected constructor(parent: GenericPortModel<O> | O, {type, name, direction}: PortModelArgs, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel) {
		super(parent);
		this.name = name;
		this.direction = direction;
		if ((type.getTypeIdentifier() === TypeIdentifier.Generic) && !this.haveGhostAncestor()) {
			this.generics = this.fetchGenerics();
		}

		this.streamPort = new StreamPort(this);
		this.reconstructPort(type, P, direction);

		this.subscribeConnected(port => {
			this.connectedWith.push(port);
		});

		this.subscribeDisconnected(port => {
			const idxT = this.connectedWith.indexOf(port);
			if (idxT === -1) {
				throw new Error(`inconsistency: not connected with that port`);
			}
			this.connectedWith.splice(idxT, 1);
		});

		if (this.generics) {
			const generics = this.generics;
			const identifier = this.genericIdentifier!;

			generics.subscribeGenericTypeChanged(identifier, type => {
				if (type) {
					this.reconstructPort(type, P, this.direction);
				}
			});

			// this.subscribeDisconnected(() => {
			// 	if (this.connectedWith.length === 0) {
			// 		// TODO: Check if anything else is connected
			// 		generics.specify(identifier, type);
			// 	}
			// });
		}

		this.streamPort.initialize();
	}

	private haveGhostAncestor(): boolean {
		if (!!this.generics) {
			return true;
		}
		const parent = this.getParentNode();
		if (parent instanceof GenericPortModel) {
			return parent.haveGhostAncestor();
		} else {
			return false;
		}
	}

	private reconstructPort(type: SlangType, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel, direction: PortDirection): void {
		if (this.typeIdentifier !== type.getTypeIdentifier()) {
			this.typeIdentifier = type.getTypeIdentifier();

			switch (this.typeIdentifier) {
				case TypeIdentifier.Map:
					for (const [subName, subType] of type.getMapSubs()) {
						this.createChildNode(P, {name: subName, type: subType, direction,});
					}
					break;
				case TypeIdentifier.Stream:
					const subType = type.getStreamSub();
					this.createChildNode(P, {name: "~", type: subType, direction,});
					break;
				case TypeIdentifier.Generic:
					const identifier = type.getGenericIdentifier();
					this.setGenericIdentifier(identifier);
					break;
			}
		} else {
			switch (this.typeIdentifier) {
				case TypeIdentifier.Map:
					const subs = Array.from(this.getMapSubs());
					for (const [subName, subType] of type.getMapSubs()) {
						const sub = subs.find(s => s.getName() === subName);
						if (sub) {
							sub.reconstructPort(subType, P, direction);
						} else {
							this.createChildNode(P, {name: subName, type: subType, direction,});
						}
					}
					// TODO: Delete ports that are no longer inside type
					break;
				case TypeIdentifier.Stream:
					const subType = type.getStreamSub();
					this.getStreamSub().reconstructPort(subType, P, direction);
					break;
				case TypeIdentifier.Generic:
					const identifier = type.getGenericIdentifier();
					this.setGenericIdentifier(identifier);
					break;
			}
		}
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

	public getBox(): BlackBox {
		const blackBox = this.getAncestorNode(BlackBox);
		if (!blackBox) {
			throw new Error(`port without blackBox detected`);
		}
		return blackBox;
	}

	private fetchGenerics(): GenericSpecifications | null {
		const blackBox = this.getAncestorNode(BlackBox);
		if (!blackBox) {
			throw new Error(`port without blackbox detected`);
		}
		if (blackBox instanceof OperatorModel) {
			return blackBox.getGenericSpecifications();
		}
		return null;
	}
	
	public isGeneric(): boolean {
		return !!this.genericIdentifier && (this.typeIdentifier === TypeIdentifier.Generic || this.typeIdentifier === TypeIdentifier.Map);
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

		this.disconnected.next(destination);
		destination.disconnected.next(this);
	}
	
	private createGenericType(other: PortModel): [SlangType, string] {
		const subName = `gen_${other.getName()}_${(new Date().getTime()) % 100}`;
		
		let newType: SlangType;
		if (this.typeIdentifier !== TypeIdentifier.Map) {
			newType = new SlangType(null, TypeIdentifier.Map);
		} else {
			newType = this.getType();
		}
		newType.addMapSub(subName, new SlangType(newType, other.getTypeIdentifier()));
		
		return [newType, subName];
	}
	
	private findGenericPort(portId: string): PortModel {
		return this.findMapSub(portId);
	}
	
	private createGenericPort(other: PortModel): PortModel {
		if (!this.generics || !this.genericIdentifier) {
			throw new Error(`not a generic port`);
		}

		if (this.typeIdentifier !== TypeIdentifier.Map && this.typeIdentifier !== TypeIdentifier.Generic) {
			this.generics.specify(this.genericIdentifier, other.getType());
			return this;
		}
		
		const genericType = this.createGenericType(other);
		this.generics.specify(this.genericIdentifier, genericType[0]);

		return this.findGenericPort(genericType[1]);
	}

	private connectDirectlyTo(destination: PortModel): void {
		let thisPort: PortModel = this;
		let otherPort: PortModel = destination;
		if (thisPort.isGeneric()) {
			thisPort = thisPort.createGenericPort(otherPort);
		}
		if (otherPort.isGeneric()) {
			otherPort = otherPort.createGenericPort(thisPort);
		}
		otherPort.connected.next(thisPort);
		thisPort.connected.next(otherPort);
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
		if (this.isGeneric()) {
			this.connectDirectlyTo(destination);
			return;
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
				this.connectDirectlyTo(destination);
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

	public isConnectedWith(other: PortModel): boolean {
		return this.connectedWith.indexOf(other) !== -1;
	}

	// Subscriptions

	public subscribeCollapsed(cb: (collapsed: boolean) => void): void {
		this.collapsed.subscribe(cb);
	}

	public subscribeConnected(cb: (other: PortModel) => void): void {
		this.connectedWith.forEach(port => {
			cb(port);
		});
		this.connected.subscribe(cb);
	}

	public subscribeDisconnected(cb: (other: PortModel) => void): void {
		this.disconnected.subscribe(cb);
	}
}

export type PortModel = GenericPortModel<PortOwner>

export type PortModelArgs = { name: string, type: SlangType, direction: PortDirection, };

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