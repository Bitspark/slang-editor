/* tslint:disable:no-circular-imports */

import {Subscription} from "rxjs";
import {SlangType, TypeIdentifier} from "../../definitions/type";
import {GenericPortModel, PortModel} from "../models/abstract/port";
import {SlangBehaviorSubject, SlangSubject} from "../models/abstract/utils/events";
import {StreamType} from "./stream-type";

function merge(oldStream: StreamType | null, newStream: StreamType | null): StreamType | null {
	if (oldStream === newStream) {
		return newStream;
	}
	if (!oldStream) {
		return newStream;
	}
	if (!newStream) {
		return oldStream;
	}

	if (newStream.getStreamDepth() > oldStream.getStreamDepth() || newStream.getStreamDepth() === oldStream.getStreamDepth() && newStream.fixedDepth() >= oldStream.fixedDepth()) {
		return newStream;
	}
	return oldStream;
}

export class StreamPort {

	private readonly streamType: SlangBehaviorSubject<StreamType>;
	private readonly streamTypeRefreshRequested = new SlangSubject<StreamType>("stream-type-changed");

	// private connectionSubscriptions = new Map<GenericPortModel<PortOwner>, Subscription>();

	constructor(private readonly port: PortModel) {
		this.streamType = this.buildStreamType();
	}

	public initialize(): void {
		// this.subscribeStreams();
	}

	/**
	 * This method uses the port owner's base stream and is the authority on all port streams.
	 * It overrides existing streams.
	 * @param stream
	 * @param override
	 */
	public setStreamTypeParentToChild(stream: StreamType, override: boolean): void {
		if (this.port.isParentStreamOrOwner()) {
			const oldStream = this.getStreamType();
			if (oldStream === stream) {
				return;
			}
			if (!override) {
				const newStream = merge(oldStream, stream);
				if (!newStream || oldStream === newStream) {
					return;
				}
				this.streamType.next(newStream);
			} else {
				this.streamType.next(stream);
			}
		}

		if (this.port.getTypeIdentifier() === TypeIdentifier.Stream) {
			const sub = this.port.getStreamSub();
			if (sub) {
				if (this.port.isSource()) {
					(sub.getStreamPort() as StreamPort).setStreamTypeParentToChild(stream.createSubStream(sub), override);
				} else {
					(sub.getStreamPort() as StreamPort).setStreamTypeParentToChild(stream.createSubStream(null), override);
				}
			}
		} else if (this.port.getTypeIdentifier() === TypeIdentifier.Map) {
			for (const sub of this.port.getMapSubs()) {
				(sub.getStreamPort() as StreamPort).setStreamTypeParentToChild(stream, override);
			}
		}
	}

	/**
	 * This method is the entrance to the port owner.
	 * All checks if streams can be connected should be made here.
	 * @param stream
	 */
	public setStreamTypeChildToParent(stream: StreamType): void {
		const oldStream = this.getStreamType();
		if (!oldStream) {
			throw new Error(`port without stream detected`);
		}

		const newStream = merge(oldStream, stream);
		if (newStream === oldStream) {
			return;
		}
		if (!newStream) {
			return;
		}

		const parent = this.port.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				(parent.getStreamPort() as StreamPort).setStreamTypeChildToParent(newStream);
			} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				this.streamType.next(newStream);
				const baseStreamType = newStream.getBaseStream(this.port.getStreamParent());
				if (!baseStreamType) {
					throw new Error(`${this.port.getOwnerName()}: insufficient stream type depth`);
				}
				(parent.getStreamPort() as StreamPort).setStreamTypeChildToParent(baseStreamType);
			} else {
				throw new Error(`${this.port.getOwnerName()}: unexpected port type, cannot be a parent`);
			}
		} else {
			this.setStreamTypeParentToChild(newStream, false);
		}
	}

	public getStreamType(): StreamType {
		return this.streamType.getValue();
	}

	public subscribeStreamTypeChanged(cb: (streamType: StreamType | null) => void): Subscription {
		return this.streamType.subscribe(cb);
	}

	public subscribeRefreshStreamType(cb: (streamType: StreamType | null) => void): Subscription {
		return this.streamTypeRefreshRequested.subscribe(cb);
	}

	public createGenericType(other: PortModel): { type: SlangType, portId: string[] } {
		const [nextStreamType, nextStreamDepth] = this.getStreamType().getStreamStep((other.getStreamPort() as StreamPort).getStreamType());

		if (nextStreamDepth === -1) {
			throw new Error(`cannot find suitable stream stack`);
		}

		let mapType: SlangType;
		if (this.port.getTypeIdentifier() !== TypeIdentifier.Map) {
			mapType = new SlangType(null, TypeIdentifier.Map);
		} else {
			mapType = this.port.getType();
		}

		const subName = `gen_${other.getName()}_${(new Date().getTime()) % 100}`;

		if (nextStreamDepth === 0) {
			mapType.addMapSub(subName, new SlangType(mapType, other.getTypeIdentifier()));
			return {type: mapType, portId: [subName]};
		}
		if (this.port.getTypeIdentifier() === TypeIdentifier.Map) {
			for (const sub of this.port.getMapSubs()) {
				if (sub.getTypeIdentifier() === TypeIdentifier.Map) {
					// TODO
					throw new Error(`nested map: not implemented`);
				}
				if (sub.getTypeIdentifier() === TypeIdentifier.Stream) {
					const streamSub = sub.getStreamSub().getStreamPort();
					if (streamSub.getStreamType() === nextStreamType) {
						const {type: createdType, portId: createdPortId} = streamSub.createGenericType(other);
						const streamType = new SlangType(mapType, TypeIdentifier.Stream);
						streamType.setStreamSub(createdType);
						mapType.addMapSub(sub.getName(), streamType);
						createdPortId.unshift("~");
						createdPortId.unshift(sub.getName());
						return {type: mapType, portId: createdPortId};
					}
				}
			}

			const portId: string[] = [];
			let newMapType = mapType;

			for (let i = 0; i < nextStreamDepth; i++) {
				const newStreamType = new SlangType(newMapType, TypeIdentifier.Stream);
				const newStreamName = `gen_str_${(new Date().getTime()) % 100}`;
				newMapType.addMapSub(newStreamName, newStreamType);
				portId.push(newStreamName);

				newMapType = new SlangType(newStreamType, TypeIdentifier.Map);
				newStreamType.setStreamSub(newMapType);
				portId.push("~");
			}

			newMapType.addMapSub(subName, new SlangType(newMapType, other.getTypeIdentifier()));
			portId.push(subName);
			return {type: mapType, portId};
		}
		// TODO
		throw new Error(`no map: not implemented`);
	}

	private buildStreamType(): SlangBehaviorSubject<StreamType> {
		const parent = this.port.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				return (parent.getStreamPort() as StreamPort).streamType;
			}
			if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				const parentStreamType = (parent.getStreamPort() as StreamPort).getStreamType();
				if (this.port.isSource()) {
					return new SlangBehaviorSubject("streamType", new StreamType(parentStreamType, this.port));
				}
				return new SlangBehaviorSubject("streamType", new StreamType(parentStreamType, null));
			}
			throw new Error(`port parents must be either map or stream`);
		}
		return new SlangBehaviorSubject("streamType", new StreamType(null, null));
	}

	// private subscribeStreams(): void {
	// 	const parent = this.port.getParentNode();
	// 	if (parent instanceof PortOwner) {
	// 		(parent.getStreamPortOwner() as StreamPortOwner).subscribeBaseStreamTypeChanged((streamType) => {
	// 			if (streamType) {
	// 				this.setStreamTypeParentToChild(streamType, (this.port.getOwner().getStreamPortOwner() as StreamPortOwner).isMarkedForReset());
	// 			}
	// 		});
	// 	}
	//
	// 	(this.port.getOwner().getStreamPortOwner() as StreamPortOwner).subscribePropagateStreamType(() => {
	// 		this.streamType.next(this.streamType.getValue());
	// 	});
	//
	// 	(this.port.getOwner().getStreamPortOwner() as StreamPortOwner).subscribeRefreshStreamType(() => {
	// 		const stream = this.getStreamType();
	// 		if (stream) {
	// 			this.streamTypeRefreshRequested.next(stream);
	// 		}
	// 	});
	//
	// 	this.port.subscribeConnected((other) => {
	// 		const subscription = (other.getStreamPort() as StreamPort).subscribeStreamTypeChanged((streamType) => {
	// 			if (!streamType || (this.port.getOwner().getStreamPortOwner() as StreamPortOwner).isMarkedForReset()) {
	// 				return;
	// 			}
	// 			this.setStreamTypeChildToParent(streamType);
	// 		});
	// 		this.connectionSubscriptions.set(other as any, subscription);
	// 	});
	//
	// 	this.port.subscribeDisconnected((other) => {
	// 		const subscription = this.connectionSubscriptions.get(other as any);
	// 		if (subscription) {
	// 			subscription.unsubscribe();
	// 		} else {
	// 			throw new Error("no subscription found");
	// 		}
	//
	// 		if (this.port.isDestination()) {
	// 			const stream = this.getStreamType();
	// 			if (stream) {
	// 				stream.resetStreamType();
	// 			}
	// 		}
	// 	});
	//
	// 	this.subscribeStreamTypeChanged((streamType) => {
	// 		if (streamType) {
	// 			this.streamTypeRefreshRequested.next(streamType);
	// 		}
	// 	});
	// }

}
