import {Subscription} from "rxjs";

import {SlangType, TypeIdentifier} from "../../definitions/type";

import {GenericPortModel, PortModel} from "./port";
import {PortOwner} from "./port-owner";
import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "./utils/events";

export class StreamType {

	public static refreshActive = true;

	private static id = 0;

	private readonly id = StreamType.id++;

	private baseStream: StreamType | null = null;

	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	private readonly startResetStreamTypeRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly finishResetStreamTypeRequested = new SlangSubject<{ mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }>("remove-unreachable");

	constructor(baseStream: StreamType | null, private source: PortModel | null) {
		this.setBaseStream(baseStream);
	}

	public containsMisplacedStreamTypeTo(searchStream: StreamType): boolean {
		let baseStream: StreamType | null = searchStream;
		let index = 0;
		while (baseStream !== null) {
			const streamIndex = this.findStreamType(baseStream);
			if (streamIndex !== -1 && streamIndex !== index) {
				return true;
			}
			baseStream = baseStream.getBaseStreamOrNull();
			index++;
		}
		return false;
	}

	public getStreamStep(other: StreamType): [StreamType | null, number] {
		if (this === other) {
			return [null, 0];
		}

		if (other.hasAncestor(this)) {
			let last = other;
			let distance = 1;
			while (last.baseStream !== this) {
				if (!last.baseStream) {
					throw new Error(`unexpected inconsistency: StreamType.hasAncestor behaving incorrectly`);
				}
				last = last.baseStream;
				distance++;
			}
			return [last, distance];
		}

		if (this.hasPlaceholderRoot()) {
			if (other.hasPlaceholderRoot()) {
				if (!containsMisplacedStreamTypeTo(this, other) && !containsMisplacedStreamTypeTo(other, this)) {
					return [null, 0];
				}
				return [null, -1];

			}
			if (this.getStreamDepth() <= other.getStreamDepth()) {
				return [null, 0];
			}
			return [null, other.getStreamDepth() - this.getStreamDepth()];
		}
		if (other.hasPlaceholderRoot()) {
			if (this.getStreamDepth() >= other.getStreamDepth()) {
				return [null, 0];
			}
			return [null, other.getStreamDepth() - this.getStreamDepth()];

		}
		return [null, -1];

	}

	public hasPlaceholderAncestor(): boolean {
		if (!this.source) {
			return true;
		}
		if (!this.baseStream) {
			return false;
		}
		return this.baseStream.hasPlaceholderAncestor();
	}

	public hasFixedAncestor(): boolean {
		if (!!this.source) {
			return true;
		}
		if (!this.baseStream) {
			return false;
		}
		return this.baseStream.hasFixedAncestor();
	}

	public getPlaceholderDepth(): number {
		if (!!this.source) {
			return 0;
		}
		if (!this.baseStream) {
			return -1;
		}
		return this.baseStream.getPlaceholderDepth() + 1;
	}

	public hasPlaceholderRoot(): boolean {
		return this.getRootStream().isPlaceholder();
	}

	public isPlaceholder(): boolean {
		return !this.source;
	}

	public createSubStream(source: PortModel | null): StreamType {
		return new StreamType(this, source);
	}

	public subscribeBaseStream(baseStream: StreamType): void {
		baseStream.subscribeNestingChanged(() => {
			this.nestingChanged.next();
		});

		baseStream.subscribeStartResetStreamType(() => {
			this.startResetStreamType();
		});
		baseStream.subscribeFinishResetStreamType(({mark, repropagate, refresh}) => {
			this.finishResetStreamType(mark, repropagate, refresh);
		});
	}

	public setBaseStream(baseStream: StreamType | null): void {
		if (baseStream) {
			if (baseStream.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}

			this.subscribeBaseStream(baseStream);
		}

		this.baseStream = baseStream;
	}

	public getBaseStream(source: PortModel | null): StreamType | null {
		if (!this.baseStream && this.isPlaceholder()) {
			this.setBaseStream(new StreamType(null, source));
			this.nestingChanged.next();
		}
		return this.baseStream;
	}

	public getBaseStreamOrNull(): StreamType | null {
		return this.baseStream;
	}

	public getSource(): PortModel | null {
		return this.source;
	}

	public fixedDepth(start = 0, current = 0): number {
		let sum = start;
		if (!this.isPlaceholder()) {
			sum += Math.pow(2, current);
		}

		if (!this.baseStream) {
			return sum;
		}

		return this.baseStream.fixedDepth(sum, current + 1);
	}

	public getRootStream(): StreamType {
		if (!this.baseStream) {
			return this;
		}
		return this.baseStream.getRootStream();
	}

	public getStreamDepth(): number {
		if (!!this.baseStream) {
			return this.baseStream.getStreamDepth() + 1;
		}
		return 1;
	}

	public resetStreamType() {
		this.getRootStream().resetStreamTypeRoot();
	}

	public subscribeStartResetStreamType(cb: () => void): Subscription {
		return this.startResetStreamTypeRequested.subscribe(cb);
	}

	public subscribeFinishResetStreamType(cb: (value: { mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }) => void): Subscription {
		return this.finishResetStreamTypeRequested.subscribe(cb);
	}

	public subscribeNestingChanged(cb: () => void): Subscription {
		return this.nestingChanged.subscribe(cb);
	}

	public toString(): string {
		let str = "";
		let baseStream: StreamType | null = this;
		while (baseStream) {
			str = (baseStream.isPlaceholder() ? `PH(${baseStream.id})` : `FX(${baseStream.id})`) + "|" + str;
			baseStream = baseStream.getBaseStreamOrNull();
		}
		return str + `DOM:${this.fixedDepth()}`;
	}

	public findStreamType(stream: StreamType): number {
		if (this === stream) {
			return 0;
		}

		if (this.baseStream) {
			const baseIndex = this.baseStream.findStreamType(stream);
			if (baseIndex === -1) {
				return baseIndex;
			}
			return baseIndex + 1;

		}

		return -1;
	}

	public compatibleTo(other: StreamType): boolean {
		return this.getStreamStep(other)[1] !== -1;
	}

	private hasAncestor(stream: StreamType): boolean {
		if (stream === this) {
			return true;
		}
		if (this.baseStream) {
			return this.baseStream.hasAncestor(stream);
		}
		return false;
	}

	private getStreamPortOwner(): StreamPortOwner | null {
		if (!this.source) {
			return null;
		}
		return this.source.getOwner().getStreamPortOwner();
	}

	private resetStreamTypeRoot() {
		StreamType.refreshActive = false;
		const streamPortOwner = this.getStreamPortOwner();
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.setMarkedForReset(true);
		}
		this.startResetStreamType();
		const mark = new SlangSubjectTrigger("mark");
		const repropagate = new SlangSubjectTrigger("repropagate");
		const refresh = new SlangSubjectTrigger("repropagate");
		this.finishResetStreamType(mark, repropagate, refresh);
		mark.next();
		repropagate.next();
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.setBaseStream(new StreamType(null, this.source));
			streamPortOwner.setMarkedForReset(false);
			streamPortOwner.propagateStreamType();
			streamPortOwner.refreshStreamType();
		}
		StreamType.refreshActive = true;
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.refreshStreamType();
		}
		refresh.next();
	}

	private startResetStreamType(): void {
		this.startResetStreamTypeRequested.next();
	}

	private finishResetStreamType(mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger): void {
		this.finishResetStreamTypeRequested.next({mark, repropagate, refresh});
	}
}

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

export function containsMisplacedStreamTypeTo(searchStream: StreamType, stream: StreamType): boolean {
	let baseStream: StreamType | null = searchStream;
	let index = 0;
	while (baseStream !== null) {
		const streamIndex = stream.findStreamType(baseStream);
		if (streamIndex !== -1 && streamIndex !== index) {
			return true;
		}
		baseStream = baseStream.getBaseStreamOrNull();
		index++;
	}
	return false;
}

export class StreamPort {

	private readonly streamType: SlangBehaviorSubject<StreamType>;
	private readonly streamTypeRefreshRequested = new SlangSubject<StreamType>("stream-type-changed");

	private connectionSubscriptions = new Map<GenericPortModel<PortOwner>, Subscription>();

	constructor(private readonly port: PortModel) {
		this.streamType = this.buildStreamType();
	}

	public initialize(): void {
		this.subscribeStreams();
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
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(sub), override);
				} else {
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(null), override);
				}
			}
		} else if (this.port.getTypeIdentifier() === TypeIdentifier.Map) {
			for (const sub of this.port.getMapSubs()) {
				sub.getStreamPort().setStreamTypeParentToChild(stream, override);
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
				parent.getStreamPort().setStreamTypeChildToParent(newStream);
			} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				this.streamType.next(newStream);
				const baseStreamType = newStream.getBaseStream(this.port.getStreamParent());
				if (!baseStreamType) {
					throw new Error(`${this.port.getOwnerName()}: insufficient stream type depth`);
				}
				parent.getStreamPort().setStreamTypeChildToParent(baseStreamType);
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
		const [nextStreamType, nextStreamDepth] = this.getStreamType().getStreamStep(other.getStreamPort().getStreamType());

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
		} else {
			// TODO
			throw new Error(`no map: not implemented`);
		}

	}

	private buildStreamType(): SlangBehaviorSubject<StreamType> {
		const parent = this.port.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				return parent.getStreamPort().streamType;
			}
			if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				const parentStreamType = parent.getStreamPort().getStreamType();
				if (this.port.isSource()) {
					return new SlangBehaviorSubject("streamType", new StreamType(parentStreamType, this.port));
				}
				return new SlangBehaviorSubject("streamType", new StreamType(parentStreamType, null));

			}
			throw new Error(`port parents must be either map or stream`);

		} else {
			return new SlangBehaviorSubject("streamType", new StreamType(null, null));
		}
	}

	private subscribeStreams(): void {
		const parent = this.port.getParentNode();
		if (parent instanceof PortOwner) {
			parent.getStreamPortOwner().subscribeBaseStreamTypeChanged((streamType) => {
				if (streamType) {
					this.setStreamTypeParentToChild(streamType, this.port.getOwner().getStreamPortOwner().isMarkedForReset());
				}
			});
		}

		this.port.getOwner().getStreamPortOwner().subscribePropagateStreamType(() => {
			this.streamType.next(this.streamType.getValue());
		});

		this.port.getOwner().getStreamPortOwner().subscribeRefreshStreamType(() => {
			const stream = this.getStreamType();
			if (stream) {
				this.streamTypeRefreshRequested.next(stream);
			}
		});

		this.port.subscribeConnected((other) => {
			const subscription = other.getStreamPort().subscribeStreamTypeChanged((streamType) => {
				if (!streamType || this.port.getOwner().getStreamPortOwner().isMarkedForReset()) {
					return;
				}
				this.setStreamTypeChildToParent(streamType);
			});
			this.connectionSubscriptions.set(other as any, subscription);
		});

		this.port.subscribeDisconnected((other) => {
			const subscription = this.connectionSubscriptions.get(other as any);
			if (subscription) {
				subscription.unsubscribe();
			} else {
				throw new Error("no subscription found");
			}

			if (this.port.isDestination()) {
				const stream = this.getStreamType();
				if (stream) {
					stream.resetStreamType();
				}
			}
		});

		this.subscribeStreamTypeChanged((streamType) => {
			if (streamType) {
				this.streamTypeRefreshRequested.next(streamType);
			}
		});
	}

}

export class StreamPortOwner {

	private readonly baseStreamType = new SlangBehaviorSubject<StreamType | null>("base-stream-type", null);
	private readonly propagateStreamTypeRequested = new SlangSubjectTrigger("base-stream-propagate");
	private readonly refreshStreamTypeRequested = new SlangSubjectTrigger("base-stream-propagate");
	private markedForReset: boolean = false;
	private baseStreamTypeSubscription: Subscription | null = null;

	constructor(private readonly portOwner: PortOwner, private readonly streamSource: boolean) {
		portOwner.subscribeChildCreated(GenericPortModel, (port) => {
			if (!this.isStreamSource()) {
				port.getStreamPort().subscribeStreamTypeChanged((streamType) => {
					this.setBaseStream(streamType);
				});
			}
		});
	}

	public initialize(): void {
		if (this.isStreamSource()) {
			this.portOwner.subscribeChildCreated(GenericPortModel, (port) => {
				if (port.isSource()) {
					this.setBaseStream(new StreamType(null, port));
				}
			});
		} else {
			this.setBaseStream(new StreamType(null, null));
		}
	}

	public isStreamSource(): boolean {
		return this.streamSource;
	}

	public setBaseStream(stream: StreamType | null): void {
		if (stream !== this.baseStreamType.getValue() && !this.isStreamSource()) {
			if (this.baseStreamTypeSubscription) {
				this.baseStreamTypeSubscription.unsubscribe();
				this.baseStreamTypeSubscription = null;
			}

			if (stream) {
				this.baseStreamTypeSubscription = new Subscription();

				this.baseStreamTypeSubscription.add(stream.subscribeStartResetStreamType(() => {
					this.setMarkedForReset(true);
				}));

				this.baseStreamTypeSubscription.add(stream.subscribeFinishResetStreamType(({mark, repropagate, refresh}) => {
					this.setBaseStream(new StreamType(null, null));

					mark.subscribe(() => {
						this.setMarkedForReset(false);
					});

					repropagate.subscribe(() => {
						this.propagateStreamType();
					});

					refresh.subscribe(() => {
						this.refreshStreamType();
					});
				}));
			}
		}

		this.baseStreamType.next(stream);
	}

	public setMarkedForReset(mark: boolean): void {
		this.markedForReset = mark;
	}

	public isMarkedForReset(): boolean {
		return this.markedForReset;
	}

	public refreshStreamType(): void {
		this.refreshStreamTypeRequested.next();
	}

	public subscribeRefreshStreamType(cb: () => void) {
		this.refreshStreamTypeRequested.subscribe(cb);
	}

	public getBaseStreamType(): StreamType | null {
		return this.baseStreamType.getValue();
	}

	public subscribeBaseStreamTypeChanged(cb: (streamType: StreamType | null) => void) {
		this.baseStreamType.subscribe(cb);
	}

	public propagateStreamType() {
		this.propagateStreamTypeRequested.next();
	}

	public subscribePropagateStreamType(cb: () => void) {
		this.propagateStreamTypeRequested.subscribe(cb);
	}

}
