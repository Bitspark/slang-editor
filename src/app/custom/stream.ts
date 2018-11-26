import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";
import {PortOwner} from "./nodes";
import {ConnectionComponent} from "../ui/components/connection";
import {GenericPortModel, PortModel} from "../model/port";
import {TypeIdentifier} from "./type";

export class StreamType {

	public dominance = 0;
	
	private baseStream: StreamType | null = null;
	
	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	private readonly startResetStreamTypeRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly finishResetStreamTypeRequested = new SlangSubject<{ mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }>("remove-unreachable");

	constructor(baseStream: StreamType | null, private source: PortOwner | null, private placeholder: boolean) {
		this.setBaseStream(baseStream);
	}

	public hasPlaceholderAncestor(): boolean {
		if (this.placeholder) {
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
		return this.placeholder;
	}

	public createSubStream(source: PortOwner | null, placeholder: boolean): StreamType {
		return new StreamType(this, source, placeholder);
	}
	
	public setBaseStream(baseStream: StreamType | null): void {
		if (baseStream) {
			if (baseStream.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}

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
		
		this.baseStream = baseStream;
	}

	public getBaseStream(): StreamType | null {
		if (!this.baseStream && this.placeholder) {
			this.setBaseStream(new StreamType(null, null, true));
			this.nestingChanged.next();
		}
		return this.baseStream;
	}
	
	public getBaseStreamOrNull(): StreamType | null {
		return this.baseStream;
	}
	
	public getSource(): PortOwner | null {
		return this.source;
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
	
	public getPlaceholderDepth(): number {
		if (!this.isPlaceholder()) {
			return 0;
		}
		
		if (!this.baseStream) {
			return 1;
		}
		
		return this.baseStream.getPlaceholderDepth() + 1;
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

	private resetStreamTypeRoot() {
		ConnectionComponent.refreshActive = false;
		
		if (this.source && this.source.getStreamPortOwner().isStreamSource()) {
			this.source.getStreamPortOwner().setMarkedForReset(true);
		}
		this.startResetStreamType();
		const mark = new SlangSubjectTrigger("mark");
		const repropagate = new SlangSubjectTrigger("repropagate");
		const refresh = new SlangSubjectTrigger("repropagate");
		this.finishResetStreamType(mark, repropagate, refresh);
		mark.next();
		repropagate.next();
		if (this.source && this.source.getStreamPortOwner().isStreamSource()) {
			this.source.getStreamPortOwner().setBaseStream(new StreamType(null, this.source, false));
			this.source.getStreamPortOwner().setMarkedForReset(false);
			this.source.getStreamPortOwner().propagateStreamType();
			this.source.getStreamPortOwner().refreshStreamType();
		}
		ConnectionComponent.refreshActive = true;
		if (this.source && this.source.getStreamPortOwner().isStreamSource()) {
			this.source.getStreamPortOwner().refreshStreamType();
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

	// public toString(): string {
	// 	const source = this.source;
	// 	const me = (this.placeholder ? "PH" : "S") + "[" + ((!!source) ? source!.getScopedIdentity() : "null") + "]";
	//
	// 	if (!!this.baseStream) {
	// 		return this.baseStream.toString() + ">" + me;
	// 	}
	// 	return me;
	// }

	public toString(): string {
		let str = "";
		let baseStream: StreamType | null = this;
		while (baseStream) {
			str = (baseStream.isPlaceholder() ? "PH" : "FX") + "|" + str;
			baseStream = baseStream.getBaseStreamOrNull();
		}
		return str;
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

function canMerge(oldStream: StreamType | null, newStream: StreamType | null): boolean {
	if (!oldStream || !newStream) {
		return true;
	}
	
	if (oldStream === newStream) {
		return true;
	}
	
	if (!oldStream.isPlaceholder() && !newStream.isPlaceholder()) {
		return false;
	}

	return canMerge(oldStream.getBaseStreamOrNull(), newStream.getBaseStreamOrNull());
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

	if (!oldStream.isPlaceholder() && !newStream.isPlaceholder()) {
		throw new Error(`cannot merge`);
	}
	
	if (oldStream.isPlaceholder() && newStream.isPlaceholder()) {
		return newStream;
	}
	
	let phStream, fixStream: StreamType;
	if (newStream.isPlaceholder()) {
		[phStream, fixStream] = [newStream, oldStream];
	} else {
		[phStream, fixStream] = [oldStream, newStream];
	}
	
	fixStream.setBaseStream(merge(phStream.getBaseStreamOrNull(), fixStream.getBaseStreamOrNull()));
	fixStream.dominance = Math.max(phStream.dominance, fixStream.dominance) + 1;
	return fixStream;
}

export class StreamPort {

	private readonly streamType: SlangBehaviorSubject<StreamType>;
	private streamDominance = 0;
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
				return new SlangBehaviorSubject("streamType", new StreamType(null, this.port.getOwner(), true));
			} else {
				throw new Error(`port parents must be either map or stream`);
			}
		} else {
			return new SlangBehaviorSubject("streamType", new StreamType(null, this.port.getOwner(), true));
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
	public setStreamTypeParentToChild(stream: StreamType, override: boolean = true): void {
		console.log(this, stream.toString());
		if (this.port.isParentStreamOrOwner()) {
			const oldStream = this.getStreamType();
			if (oldStream === stream && stream.dominance <= this.streamDominance) {
				console.log(">Equal");
				return;
			}
			if (!override && !!oldStream && stream.isPlaceholder() && !oldStream.isPlaceholder()) {
				console.log(">Weaker");
				return;
			}
			console.log(this, ">Set", stream.toString());
			this.streamDominance = stream.dominance;
			this.streamType.next(stream);
		}

		if (this.port.getTypeIdentifier() === TypeIdentifier.Stream) {
			const sub = this.port.getStreamSub();
			if (sub) {
				if (this.port.isSource()) {
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(this.port.getOwner(), false), override);
				} else {
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(null, true), override);
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
		
		let newStream: StreamType | null = stream;
		if (!canMerge(oldStream, stream)) {
			return;
		}
		newStream = merge(oldStream, stream);
		if (newStream === oldStream && newStream.dominance <= this.streamDominance) {
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
				this.streamDominance = newStream.dominance;
				this.streamType.next(newStream);
				const baseStreamType = newStream.getBaseStream();
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
		this.setBaseStream(new StreamType(null, this.portOwner, !this.isStreamSource()));
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
					this.baseStreamType.next(new StreamType(null, this.portOwner, true));

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

		if (stream) {
			console.log(this, ">Set", stream.toString());
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