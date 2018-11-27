import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";
import {PortOwner} from "./nodes";
import {ConnectionComponent} from "../ui/components/connection";
import {GenericPortModel, PortDirection, PortModel} from "../model/port";
import {TypeIdentifier} from "./type";

export class StreamType {
	
	private static id = 0;
	
	private readonly id = StreamType.id++;
	
	private baseStream: StreamType | null = null;
	
	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	private readonly startResetStreamTypeRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly finishResetStreamTypeRequested = new SlangSubject<{ mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }>("remove-unreachable");
	
	constructor(baseStream: StreamType | null, private source: PortModel | null) {
		this.setBaseStream(baseStream);
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
	
	public fixedDepth(sum = 0, current = 0): number {
		if (!this.isPlaceholder()) {
			sum += 1 << current;
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
		if (this.baseStream) {
			return this.baseStream.getStreamDepth() + 1;
		}
		return 1;
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

	public resetStreamType() {
		this.getRootStream().resetStreamTypeRoot();
	}
	
	private getStreamPortOwner(): StreamPortOwner | null {
		if (!this.source) {
			return null;
		}
		return this.source.getOwner().getStreamPortOwner();
	}

	private resetStreamTypeRoot() {
		ConnectionComponent.refreshActive = false;
		
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
		ConnectionComponent.refreshActive = true;
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
			} else {
				return baseIndex + 1;
			}
		}
		
		return -1;
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
	
	if (newStream.getStreamDepth() > oldStream.getStreamDepth() || newStream.getStreamDepth() == oldStream.getStreamDepth() && newStream.fixedDepth() >= oldStream.fixedDepth()) {
		return newStream;
	} else {
		return oldStream;
	}
}

export function hasCommonStreamTypeTo(searchStream: StreamType, stream: StreamType): boolean {
	let baseStream: StreamType | null = searchStream;
	while (baseStream !== null) {
		const streamIndex = stream.findStreamType(baseStream);
		if (streamIndex !== -1) {
			return true;
		}
		baseStream = baseStream.getBaseStreamOrNull();
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

	private buildStreamType(): SlangBehaviorSubject<StreamType> {
		const parent = this.port.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				return parent.getStreamPort().streamType;
			} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				// TODO: This streamType always has to have the parent's streamType as baseStream, ensure that
				return new SlangBehaviorSubject("streamType", new StreamType(null, null));
			} else {
				throw new Error(`port parents must be either map or stream`);
			}
		} else {
			return new SlangBehaviorSubject("streamType", new StreamType(null, null));
		}
	}

	private subscribeStreams(): void {
		const parent = this.port.getParentNode();
		if (parent instanceof PortOwner) {
			parent.getStreamPortOwner().subscribeBaseStreamTypeChanged(streamType => {
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

		if (this.port.isDestination()) {
			this.port.subscribeConnected(connection => {
				setTimeout(() => {
					const subscription = connection.source.getStreamPort().subscribeStreamTypeChanged(streamType => {
						if (!streamType || this.port.getOwner().getStreamPortOwner().isMarkedForReset()) {
							return;
						}
						this.setStreamTypeChildToParent(streamType);
					});
					this.connectionSubscriptions.set(connection.source as any, subscription);
				}, 100);
			});

			this.port.subscribeDisconnected(connection => {
				const subscription = this.connectionSubscriptions.get(connection.source as any);
				if (subscription) {
					subscription.unsubscribe();
				} else {
					throw new Error("no subscription found");
				}

				const stream = this.getStreamType();
				if (stream) {
					setTimeout(() => {
						stream.resetStreamType();
					}, 100);
				}
			});
		}

		if (this.port.isSource()) {
			this.port.subscribeConnected(connection => {
				setTimeout(() => {
					const subscription = connection.destination.getStreamPort().subscribeStreamTypeChanged(streamType => {
						if (!streamType || this.port.getOwner().getStreamPortOwner().isMarkedForReset()) {
							return;
						}
						this.setStreamTypeChildToParent(streamType);
					});
					this.connectionSubscriptions.set(connection.destination as any, subscription);
				}, 100);
			});
			
			this.port.subscribeDisconnected(connection => {
				const subscription = this.port.getStreamPort().connectionSubscriptions.get(connection.destination as any);
				if (subscription) {
					subscription.unsubscribe();
				} else {
					throw new Error("no subscription found");
				}
			});
		}

		this.subscribeStreamTypeChanged(streamType => {
			if (streamType) {
				this.streamTypeRefreshRequested.next(streamType);
			}
		});
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
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(this.port.getStreamParent()), override);
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

		let newStream = merge(oldStream, stream);
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
	
}

export class StreamPortOwner {
	
	private readonly baseStreamType = new SlangBehaviorSubject<StreamType | null>("base-stream-type", null);
	private readonly propagateStreamTypeRequested = new SlangSubjectTrigger("base-stream-propagate");
	private readonly refreshStreamTypeRequested = new SlangSubjectTrigger("base-stream-propagate");
	private markedForReset: boolean = false;
	private baseStreamTypeSubscription: Subscription | null = null;
	
	constructor (private readonly portOwner: PortOwner, private readonly streamSource: boolean) {
		portOwner.subscribeChildCreated(GenericPortModel, port => {
			if (!this.isStreamSource()) {
				port.getStreamPort().subscribeStreamTypeChanged(streamType => {
					this.setBaseStream(streamType);
				})
			}
		});
	}
	
	public initialize(): void {
		if (this.isStreamSource()) {
			this.portOwner.subscribeChildCreated(GenericPortModel, port => {
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