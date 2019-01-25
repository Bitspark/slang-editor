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

import {Subscription} from "rxjs";

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
	private typeIdentifier: TypeIdentifier = TypeIdentifier.Generic;
	
	// Identifier of a foreign generic type that this port has been assigned
	protected assignedIdentifier?: string;

	// Identifier of this generic port (in case this port is a generic port)
	// Checking this member variable is also the only reliable way to find out if this port is truly a generic
	protected genericIdentifier?: string;
	
	private streamDepth: number = 0;
	protected connectedWith: Array<PortModel> = [];

	// Mixins
	private readonly streamPort: StreamPort;
	
	protected constructor(parent: GenericPortModel<O> | O, {type, name, direction, reconstruction}: PortModelArgs, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel) {
		super(parent);
		this.name = name;
		this.direction = direction;
		
		if (type.getTypeIdentifier() === TypeIdentifier.Generic && !reconstruction) {
			this.genericIdentifier = type.getGenericIdentifier();
		}

		this.streamPort = new StreamPort(this);
		this.reconstruct(type, P, direction, reconstruction);

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

		this.subscribeDestroyed(() => {
			this.disconnectAll();
			
			if (this.genericIdentifier) {
				const generics = this.fetchGenerics();
				if (generics) {
					generics.unregisterPort(this.genericIdentifier, this);
				}
			}
		});

		if (this.genericIdentifier) {
			const generics = this.fetchGenerics();
			const identifier = this.genericIdentifier;

			if (generics) {
				generics.registerPort(identifier, this);

				generics.subscribeGenericTypeChanged(identifier, type => {
					if (type) {
						this.reconstruct(type, P, this.direction, true);
					}
				});

				this.subscribeChildCreated(GenericPortModel, childPort => {
					childPort.subscribeDisconnected(() => {
						if (this.connectedWith.length === 0) {
							const newType = generics.getUnifiedType(identifier);
							if (newType && !generics.get(identifier).equals(newType)) {
								generics.specify(identifier, newType);
							}
						}
					});
				})
			}
		}

		this.streamPort.initialize();
	}

	public generify(identifier: string, generics: GenericSpecifications, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel): void {
		if (!this.isGeneric() && this.typeIdentifier === TypeIdentifier.Map) {
			this.genericIdentifier = identifier;
			generics.registerPort(identifier, this);
			generics.subscribeGenericTypeChanged(identifier, type => {
				if (type) {
					this.reconstruct(type, P, this.direction, true);
				}
			});
		}
	}
	
	public reconstruct(type: SlangType, P: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel, direction: PortDirection, reconstruction: boolean): void {
		if (this.typeIdentifier !== type.getTypeIdentifier()) {
			this.typeIdentifier = type.getTypeIdentifier();

			switch (this.typeIdentifier) {
				case TypeIdentifier.Map:
					for (const [subName, subType] of type.getMapSubs()) {
						this.createChildNode(P, {name: subName, type: subType, direction, reconstruction: reconstruction,});
					}
					break;
				case TypeIdentifier.Stream:
					const subType = type.getStreamSub();
					this.createChildNode(P, {name: "~", type: subType, direction, reconstruction: reconstruction,});
					break;
				case TypeIdentifier.Generic:
					if (reconstruction) {
						this.assignedIdentifier = type.getGenericIdentifier();
					} else {
						this.genericIdentifier = type.getGenericIdentifier();
					}
					break;
			}
		} else {
			switch (this.typeIdentifier) {
				case TypeIdentifier.Map:
					const subs = Array.from(this.getMapSubs());
					for (const [subName, subType] of type.getMapSubs()) {
						const sub = subs.find(s => s.getName() === subName);
						if (sub) {
							sub.reconstruct(subType, P, direction, reconstruction,);
						} else {
							this.createChildNode(P, {name: subName, type: subType, direction, reconstruction: reconstruction,});
						}
					}
					for (const sub of this.getMapSubs()) {
						if (!type.findMapSub(sub.getName())) {
							sub.destroy();
						}
					}
					break;
				case TypeIdentifier.Stream:
					const subType = type.getStreamSub();
					this.getStreamSub().reconstruct(subType, P, direction, reconstruction);
					break;
				case TypeIdentifier.Generic:
					if (reconstruction) {
						this.assignedIdentifier = type.getGenericIdentifier();
					} else {
						this.genericIdentifier = type.getGenericIdentifier();
					}
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
		return blackBox.getGenerics();
	}

	public abstract isGeneric(): boolean;

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

	public abstract getGenericIdentifier(): string | undefined;

	// public getActualType(): SlangType {
	// 	switch (this.typeIdentifier) {
	// 		case TypeIdentifier.Map: {
	// 			const type = new SlangType(null, TypeIdentifier.Map);
	// 			for (const subPort of this.getMapSubs()) {
	// 				const subType = this.getStreamSub().getActualType();
	// 				type.addMapSub(subPort.getName(), subType);
	// 			}
	// 			return type;
	// 		}
	// 		case TypeIdentifier.Stream: {
	// 			const type = new SlangType(null, TypeIdentifier.Stream);
	// 			const subType = this.getStreamSub().getActualType();
	// 			type.setStreamSub(subType);
	// 			return type;
	// 		}
	// 		case TypeIdentifier.Generic: {
	// 			if (this.assignedIdentifier) {
	// 				const type = new SlangType(null, TypeIdentifier.Generic);
	// 				type.setGenericIdentifier(this.assignedIdentifier);
	// 				return type;
	// 			} else {
	// 				return new SlangType(null, TypeIdentifier.Unspecified);
	// 			}
	// 		}
	// 		default:
	// 			return new SlangType(null, this.typeIdentifier);
	// 	}
	// }

	public getOriginalType(): SlangType {
		const type = new SlangType(null, this.typeIdentifier);
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const subPort of this.getMapSubs()) {
					type.addMapSub(subPort.getName(), subPort.getOriginalType());
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(this.getStreamSub().getOriginalType());
				break;
			case TypeIdentifier.Generic:
				const identifier = this.getGenericIdentifier();
				if (!identifier) {
					throw new Error(`generic port without identifier`);
				}
				type.setGenericIdentifier(identifier);
				break;
		}
		return type;
	}

	public anySubstreamConnected(): boolean {
		if (this.connectedWith.length !== 0) {
			return true;
		}

		if (this.typeIdentifier === TypeIdentifier.Map) {
			for (const sub of this.getMapSubs()) {
				if (sub.anySubstreamConnected()) {
					return true;
				}
			}
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
			return this.getStreamSub().anySubstreamConnected();
		}

		return false;
	}

	public getConnectedType(): SlangType {
		const type = new SlangType(null, this.typeIdentifier);
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const subPort of this.getMapSubs()) {
					if (subPort.anySubstreamConnected()) {
						const subType = subPort.getConnectedType();
						if (!subType.isVoid()) {
							type.addMapSub(subPort.getName(), subType);
						}
					}
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(this.getStreamSub().getConnectedType());
				break;
			case TypeIdentifier.Generic:
				const identifier = this.getGenericIdentifier();
				if (!identifier) {
					throw new Error(`generic port without identifier`);
				}
				type.setGenericIdentifier(identifier);
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
				connections.add({source: this, destination: connectedWith});
			}
		}
		return connections;
	}

	public getDirectConnections(): Connections {
		const connections = new Connections();
		if (this.isSource()) {
			for (const connectedWith of this.connectedWith) {
				connections.add({source: this, destination: connectedWith});
			}
		} else {
			for (const connectedWith of this.connectedWith) {
				connections.add({source: connectedWith, destination: this});
			}
		}
		return connections;
	}
	
	public getConnections(): Connections {
		const connections = new Connections();
		connections.addAll(this.getDirectConnections());
		for (const child of this.getChildNodes(GenericPortModel)) {
			connections.addAll(child.getConnections());
		}
		return connections;
	}

	public getConnectionsTo(): Connections {
		const connections = this.getDirectConnectionsTo();
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				const mapSubs = this.getMapSubs();
				for (const mapSub of mapSubs) {
					connections.addAll(mapSub.getConnectionsTo());
				}
				break;
			case TypeIdentifier.Stream:
				const streamSub = this.getStreamSub();
				if (!streamSub) {
					throw new Error(`stream port without stream sub port`);
				}
				connections.addAll(streamSub.getConnectionsTo());
				break;
		}
		return connections;
	}

	public getPortReference(): string {
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

	public isTrigger(): boolean {
		return this.typeIdentifier === TypeIdentifier.Trigger;
	}
	
	// Actions

	public collapse(): void {
		if (this.getOriginalType().getTypeIdentifier() !== TypeIdentifier.Map) {
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

	public disconnectAll() {
		if (this.isSource()) {
			for (const destination of this.connectedWith) {
				this.disconnectTo(destination);
			}
		} else {
			for (const source of this.connectedWith) {
				source.disconnectTo(this);
			}
		}
	}

	private findGenericPort(portId: Array<string>): PortModel {
		if (portId.length === 0) {
			return this;
		}

		const nextPortId = portId.shift();

		if (!nextPortId) {
			throw new Error(`unexpected empty array`);
		}

		if (nextPortId === "~") {
			return this.getStreamSub().findGenericPort(portId);
		} else {
			return this.findMapSub(nextPortId).findGenericPort(portId);
		}
	}

	private createGenericPort(other: PortModel): PortModel {
		const generics = this.fetchGenerics();
		if (!generics || !this.genericIdentifier) {
			throw new Error(`not a generic port`);
		}
		if (this.typeIdentifier !== TypeIdentifier.Map && this.typeIdentifier !== TypeIdentifier.Generic) {
			// TODO: Replace this legacy solution once all generics are ensured to be maps
			generics.specify(this.genericIdentifier, other.getOriginalType());
			return this;
		}

		const {type, portId} = this.streamPort.createGenericType(other);

		generics.specify(this.genericIdentifier, type);
		return this.findGenericPort(portId);
	}

	private connectDirectlyTo(destination: PortModel, createGenerics: boolean): void {
		let thisPort: PortModel = this;
		let otherPort: PortModel = destination;
		if (createGenerics) {
			if (thisPort.isGeneric()) {
				thisPort = thisPort.createGenericPort(otherPort);
			}
			if (otherPort.isGeneric()) {
				otherPort = otherPort.createGenericPort(thisPort);
			}
		}
		otherPort.connected.next(thisPort);
		thisPort.connected.next(otherPort);
	}

	/**
	 * Connects this port to the destination port.
	 * This has to be a source port and destination a destination port.
	 * @param destination
	 * @param createGenerics
	 */
	private connectTo(destination: PortModel, createGenerics: boolean) {		
		if (!canConnectTo(this, destination)) {
			throw new Error(`cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`);
		}
		if (this.isGeneric() || destination.isTrigger()) {
			this.connectDirectlyTo(destination, createGenerics);
			return;
		}
		switch (this.typeIdentifier) {
			case TypeIdentifier.Map:
				for (const subPort of this.getMapSubs()) {
					subPort.connectTo(destination.findMapSub(subPort.getName()), createGenerics);
				}
				break;
			case TypeIdentifier.Stream:
				this.getStreamSub().connectTo(destination.getStreamSub(), createGenerics);
				break;
			default:
				this.connectDirectlyTo(destination, createGenerics);
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

	public connect(other: PortModel, createGenerics: boolean) {
		if (this.isSource()) {
			this.connectTo(other, createGenerics);
		} else {
			other.connectTo(this, createGenerics);
		}
	}

	public isConnected(): boolean {
		return this.connectedWith.length > 0;
	}

	public isConnectedWith(other: PortModel): boolean {
		return this.connectedWith.indexOf(other) !== -1;
	}

	// Subscriptions

	public subscribeCollapsed(cb: (collapsed: boolean) => void): void {
		this.collapsed.subscribe(cb);
	}

	public subscribeConnected(cb: (other: PortModel) => void): Subscription {
		this.connectedWith.forEach(port => {
			cb(port);
		});
		return this.connected.subscribe(cb);
	}

	public subscribeDisconnected(cb: (other: PortModel) => void): void {
		this.disconnected.subscribe(cb);
	}
}

export type PortModel = GenericPortModel<PortOwner>

export type PortModelArgs = { name: string, type: SlangType, direction: PortDirection, reconstruction: boolean, };

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
	public constructor(parent: BlueprintModel | BlueprintDelegateModel | BlueprintPortModel, args: PortModelArgs) {
		super(parent, args, BlueprintPortModel);
	}

	public isSource(): boolean {
		return this.isDirectionIn();
	}
	
	public isGeneric(): boolean {
		return false;
	}

	public getGenericIdentifier(): string | undefined {
		return this.genericIdentifier;
	}
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
	public constructor(parent: OperatorModel | OperatorDelegateModel | OperatorPortModel, args: PortModelArgs) {
		super(parent, args, OperatorPortModel);
	}

	public isSource(): boolean {
		return this.isDirectionOut();
	}

	public isGeneric(): boolean {
		return !!this.genericIdentifier;
	}

	public getGenericIdentifier(): string | undefined {
		return this.assignedIdentifier;
	}
}