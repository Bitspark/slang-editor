import {Subscription} from "rxjs";

import {SlangType, TypeIdentifier} from "../../definitions/type";

import {BlackBox} from "./blackbox";
import {SlangNode} from "./nodes";
import {PortOwner} from "./port-owner";
import {StreamPort} from "./stream";
import {canConnectTo} from "./utils/connection-check";
import {Connections} from "./utils/connections";
import {SlangSubject} from "./utils/events";
import {GenericSpecifications} from "./utils/generics";

export enum PortDirection {
	In, // 0
	Out, // 1
}

export interface PortGenerics {
	specifications: GenericSpecifications;
	identifier: string;
	fake: boolean;
}

export abstract class GenericPortModel<O extends PortOwner> extends SlangNode {

	protected connectedWith: PortModel[] = [];
	protected typeIdentifier = TypeIdentifier.Unspecified;

	// Topics
	// self
	private readonly connected = new SlangSubject<PortModel>("connected");
	private readonly disconnected = new SlangSubject<PortModel>("disconnected");

	// Properties
	private readonly name: string;
	private readonly direction: PortDirection;
	private genericIdentifier?: string;

	// Mixins
	private readonly streamPort: StreamPort;

	protected constructor(parent: GenericPortModel<O> | O, {type, name, direction}: PortModelArgs, portCtor: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel, protected readonly generics: PortGenerics | null) {
		super(parent);
		this.name = name;
		this.direction = direction;

		this.subscribe();

		this.streamPort = new StreamPort(this);
		this.reconstruct(type, portCtor, direction);
		this.streamPort.initialize();
	}

	public reconstruct(type: SlangType, portCtor: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel, direction: PortDirection, generic: boolean = false): void {
		/*
		 * When generic == true then this method is called because this port is generic-like and its specification has changed
		 * When generic == false then this method is called because the port is being reconstructed
		 *   either because is is being constructed for the first time
		 *   or because a property has changed
		 * In case a property has changed and this port is generic-like we need to take care to not reset its type
		 */

		if (!generic && this.isGenericLike() && !this.getType().isUnspecified()) {
			return;
		}

		if (this.typeIdentifier !== type.getTypeIdentifier()) {
			this.typeIdentifier = type.getTypeIdentifier();
			switch (this.typeIdentifier) {
				case TypeIdentifier.Map: {
					for (const [subName, subType] of type.getMapSubs()) {
						this.createChildNode(portCtor, {direction, name: subName, type: subType});
					}
					break;
				}
				case TypeIdentifier.Stream: {
					const subType = type.getStreamSub();
					this.createChildNode(portCtor, {direction, name: this.name, type: subType});
					break;
				}
				case TypeIdentifier.Generic: {
					this.genericIdentifier = type.getGenericIdentifier();
					break;
				}
			}
		} else {
			switch (this.typeIdentifier) {
				case TypeIdentifier.Map: {
					const subs = Array.from(this.getMapSubs());
					for (const [subName, subType] of type.getMapSubs()) {
						const sub = subs.find((s) => s.getName() === subName);
						if (sub) {
							sub.reconstruct(subType, portCtor, direction);
						} else {
							this.createChildNode(portCtor, {direction, name: subName, type: subType});
						}
					}
					for (const sub of this.getMapSubs()) {
						if (!type.findMapSub(sub.getName())) {
							sub.destroy();
						}
					}
					break;
				}
				case TypeIdentifier.Stream: {
					const subType = type.getStreamSub();
					this.getStreamSub().reconstruct(subType, portCtor, direction);
					break;
				}
				case TypeIdentifier.Generic: {
					this.genericIdentifier = type.getGenericIdentifier();
					break;
				}
			}
		}

		if (generic || !this.isGenericLikeDescent()) {
			return;
		}

		this.typeIdentifier = type.getTypeIdentifier();
		this.subscribeGenerics(portCtor);
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
		const mapSub = this.scanChildNode(GenericPortModel, (port) => port.getName() === name);
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

	public getBlackBox(): BlackBox {
		const blackBox = this.getAncestorNode(BlackBox);
		if (!blackBox) {
			throw new Error(`port without blackBox detected`);
		}
		return blackBox;
	}

	public getGenericIdentifier(): string {
		if (!this.genericIdentifier) {
			throw new Error(`generic identifier missing`);
		}
		return this.genericIdentifier;
	}

	public isGenericLike(): boolean {
		return !!this.generics;
	}
	
	public isGhostPort(): boolean {
		return this.isGenericLike() && (this.getType().isUnspecified() || this.getType().isMap());
	}

	public isGenericLikeDescent(): boolean {
		if (this.isGenericLike()) {
			return true;
		}
		const parent = this.getParentNode();
		if (parent instanceof GenericPortModel) {
			return parent.isGenericLikeDescent();
		}
		return false;
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
		}
		return "unknown";
	}

	public getStreamSub(): GenericPortModel<O> {
		if (this.typeIdentifier !== TypeIdentifier.Stream) {
			throw new Error(`accessing stream port of a port of type '${TypeIdentifier[this.typeIdentifier]}' not possible`);
		}
		const streamSub = this.getChildNode(GenericPortModel);
		if (!streamSub) {
			throw new Error(`stream port not having sub stream port`);
		}
		return streamSub;
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
					if (!subPort.anySubstreamConnected()) {
						continue;
					}
					const subType = subPort.getConnectedType();
					if (!subType.isVoid()) {
						type.addMapSub(subPort.getName(), subType);
					}
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(this.getStreamSub().getConnectedType());
				break;
			case TypeIdentifier.Generic:
				type.setGenericIdentifier(this.getGenericIdentifier());
				break;
			default:
				if (!this.anySubstreamConnected()) {
					return SlangType.newUnspecified();
				}
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
		return this.streamPort.getStreamType().getStreamDepth();
	}

	public getDescendantPorts(): Array<GenericPortModel<O>> {
		const ports: Array<GenericPortModel<O>> = [this];
		if (this.typeIdentifier === TypeIdentifier.Map) {
			const subs = this.getMapSubs();
			for (const sub of subs) {
				ports.push.apply(ports, sub.getDescendantPorts());
			}
		} else if (this.typeIdentifier === TypeIdentifier.Stream) {
			const sub = this.getStreamSub();
			if (sub) {
				ports.push.apply(ports, sub.getDescendantPorts());
			}
		}
		return ports;
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
		const connections = new Connections();
		if (!this.isSource()) {
			return connections;
		}
		connections.addAll(this.getDirectConnectionsTo());
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
		}

		if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
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

	public isGeneric(): boolean {
		return this.typeIdentifier === TypeIdentifier.Generic;
	}

	public isStream(): boolean {
		return this.typeIdentifier === TypeIdentifier.Stream;
	}

	// Actions

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

	public canConnect(other: PortModel): boolean {
		if (this.isSource()) {
			return canConnectTo(this, other);
		}
		return canConnectTo(other, this);

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

	public subscribeConnected(cb: (other: PortModel) => void): Subscription {
		this.connectedWith.forEach((port) => {
			cb(port);
		});
		return this.connected.subscribe(cb);
	}

	public subscribeDisconnected(cb: (other: PortModel) => void): void {
		this.disconnected.subscribe(cb);
	}

	public specifyGenericPort(generics: PortGenerics, other: PortModel): PortModel {
		const specifications = generics.specifications;
		const identifier = generics.identifier;

		if (this.typeIdentifier === TypeIdentifier.Unspecified) {
			this.typeIdentifier = TypeIdentifier.Map;
		} else if (this.typeIdentifier !== TypeIdentifier.Map) {
			// TODO: Replace this legacy solution once all specifications are ensured to be maps
			specifications.specify(identifier, other.getType());
			return this;
		}

		const {type, portId} = this.streamPort.createGenericType(other);
		specifications.specify(identifier, type);
		return this.findGenericPort(portId);
	}

	// Private methods

	private subscribe(): void {
		this.subscribeConnected((port) => {
			this.connectedWith.push(port);
		});

		this.subscribeDisconnected((port) => {
			const idxT = this.connectedWith.indexOf(port);
			if (idxT === -1) {
				throw new Error(`inconsistency: not connected with that port`);
			}
			this.connectedWith.splice(idxT, 1);
		});

		this.subscribeDestroyed(() => {
			this.disconnectAll();
		});
	}

	private subscribeGenerics(portCtor: new(p: GenericPortModel<O> | O, args: PortModelArgs) => PortModel): void {
		const fetchedGenerics = this.fetchGenerics();
		const specifications = fetchedGenerics.specifications;
		const identifier = fetchedGenerics.identifier;

		this.subscribeDestroyed(() => {
			fetchedGenerics.specifications.unregisterPort(fetchedGenerics.identifier, this);
		});

		this.subscribeDisconnected(() => {
			if (this.connectedWith.length !== 0) {
				return;
			}

			const newType = specifications.getUnifiedType(identifier);
			if (newType && !specifications.get(identifier).equals(newType)) {
				specifications.specify(identifier, newType);
			}
		});

		if (!this.isGenericLike()) {
			return;
		}

		specifications.registerPort(identifier, this);
		specifications.subscribeGenericTypeChanged(identifier, (newType) => {
			if (newType) {
				this.reconstruct(newType, portCtor, this.direction, true);
			} else {
				this.typeIdentifier = TypeIdentifier.Unspecified;
				this.genericIdentifier = undefined;
			}
		});
	}

	private fetchGenerics(): PortGenerics {
		if (!!this.generics) {
			return this.generics;
		}
		const parent = this.getParentNode();
		if (parent instanceof GenericPortModel) {
			return parent.fetchGenerics();
		}
		throw new Error(`no generics defined`);
	}

	private getDirectConnectionsTo(): Connections {
		const connections = new Connections();
		if (!this.isSource()) {
			return connections;
		}
		for (const connectedWith of this.connectedWith) {
			connections.add({source: this, destination: connectedWith});
		}
		return connections;
	}

	private findGenericPort(portId: string[]): PortModel {
		if (portId.length === 0) {
			return this;
		}

		const nextPortId = portId.shift();

		if (!nextPortId) {
			throw new Error(`unexpected empty array`);
		}

		if (nextPortId === "~") {
			return this.getStreamSub().findGenericPort(portId);
		}
		return this.findMapSub(nextPortId).findGenericPort(portId);

	}

	private createDescendingGenericPort(other: PortModel): PortModel {
		if (!this.isGenericLike()) {
			throw new Error(`not a generic-like port`);
		}
		return this.specifyGenericPort(this.fetchGenerics(), other);
	}

	private connectDirectlyTo(destination: PortModel, createGenerics: boolean): void {
		let thisPort: PortModel = this;
		let otherPort: PortModel = destination;
		if (createGenerics) {
			if (thisPort.isGenericLike()) {
				thisPort = thisPort.createDescendingGenericPort(otherPort);
			}
			if (otherPort.isGenericLike()) {
				otherPort = otherPort.createDescendingGenericPort(thisPort);
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
		if (!canConnectTo(this, destination, createGenerics)) {
			throw new Error(`cannot connect: ${this.getIdentity()} --> ${destination.getIdentity()}`);
		}
		if ((createGenerics && this.isGenericLike()) || destination.isTrigger()) {
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
}

export type PortModel = GenericPortModel<PortOwner>;

export interface PortModelArgs {
	name: string;
	type: SlangType;
	direction: PortDirection;
}
