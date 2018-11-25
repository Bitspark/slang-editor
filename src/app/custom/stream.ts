import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";
import {PortOwner} from "./nodes";
import {ConnectionComponent} from "../ui/components/connection";
import {GenericPortModel, PortModel} from "../model/port";
import {TypeIdentifier} from "./type";

export class StreamType {

	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	private readonly startResetStreamTypeRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly finishResetStreamTypeRequested = new SlangSubject<{ mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }>("remove-unreachable");

	constructor(private baseStream: StreamType | null, private source: PortOwner | null, private placeholder: boolean) {
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
	}

	public isPlaceholder(): boolean {
		return this.placeholder;
	}

	public createSubStream(source: PortOwner | null, placeholder: boolean): StreamType {
		if (this.placeholder && !placeholder) {
			throw new Error(`sub streams of placeholder streams must be placeholders as well`);
		}
		return new StreamType(this, source, placeholder);
	}

	public getBaseStream(): StreamType | null {
		if (!this.baseStream && this.placeholder) {
			this.baseStream = new StreamType(null, null, true);

			this.baseStream.subscribeNestingChanged(() => {
				this.nestingChanged.next();
			});

			this.baseStream.subscribeStartResetStreamType(() => {
				this.startResetStreamType();
			});
			this.baseStream.subscribeFinishResetStreamType(({mark, repropagate, refresh}) => {
				this.finishResetStreamType(mark, repropagate, refresh);
			});

			this.nestingChanged.next();
		}
		return this.baseStream;
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

	private resetStreamTypeRoot() {
		ConnectionComponent.refreshActive = false;
		ConnectionComponent.refreshes = 0;
		
		if (this.source && this.source.isStreamSource()) {
			this.source.setMarkedForReset(true);
		}
		this.startResetStreamType();
		const mark = new SlangSubjectTrigger("mark");
		const repropagate = new SlangSubjectTrigger("repropagate");
		const refresh = new SlangSubjectTrigger("repropagate");
		this.finishResetStreamType(mark, repropagate, refresh);
		mark.next();
		repropagate.next();
		if (this.source && this.source.isStreamSource()) {
			this.source.setBaseStream(new StreamType(null, this.source, false));
			this.source.setMarkedForReset(false);
			this.source.propagateStreamType();
			this.source.refreshStreamType();
		}
		ConnectionComponent.refreshActive = true;
		if (this.source && this.source.isStreamSource()) {
			this.source.refreshStreamType();
		}
		refresh.next();
		
		console.log(ConnectionComponent.refreshes);
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
		const source = this.source;
		const me = (this.placeholder ? "PH" : "S") + "[" + ((!!source) ? source!.getScopedIdentity() : "null") + "]";

		if (!!this.baseStream) {
			return this.baseStream.toString() + ">" + me;
		}
		return me;
	}

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
			parent.subscribeBaseStreamTypeChanged(streamType => {
				if (streamType) {
					this.setStreamTypeParentToChild(streamType, this.port.getOwner().isMarkedForReset());
				}
			});
		}

		this.port.getOwner().subscribePropagateStreamType(() => {
			this.streamType.next(this.streamType.getValue());
		});

		this.port.getOwner().subscribeRefreshStreamType(() => {
			const stream = this.getStreamType();
			if (stream) {
				this.streamTypeRefreshRequested.next(stream);
			}
		});

		if (this.port.isDestination()) {
			this.port.subscribeConnected(connection => {
				setTimeout(() => {
					const subscription = connection.source.getStreamPort().subscribeStreamTypeChanged(streamType => {
						if (!streamType || this.port.getOwner().isMarkedForReset()) {
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
					console.log("no subscription found");
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
						if (!streamType || this.port.getOwner().isMarkedForReset()) {
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
					console.log("no subscription found");
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
		if (this.port.isParentStreamOrOwner()) {
			const oldStream = this.getStreamType();
			if (oldStream === stream) {
				return;
			}
			if (!override && !!oldStream && stream.isPlaceholder() && !oldStream.isPlaceholder()) {
				return;
			}
			this.streamType.next(stream);
		}

		if (this.port.getTypeIdentifier() === TypeIdentifier.Stream) {
			const sub = this.port.getStreamSub();
			if (sub) {
				if (this.port.isSource()) {
					sub.getStreamPort().setStreamTypeParentToChild(stream.createSubStream(this.port.getOwner(), stream.isPlaceholder()), override);
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

		if (stream === oldStream) {
			return;
		}
		if (!oldStream.isPlaceholder()) {
			if (stream.isPlaceholder()) {
				return;
			} else {
				console.log(this, stream, oldStream);
				throw new Error(`incompatible streams`);
			}
		} else if (!oldStream.getRootStream().isPlaceholder() && stream.getRootStream().isPlaceholder()) {
			return;
		}

		const parent = this.port.getParentNode();
		if (parent instanceof GenericPortModel) {
			if (parent.getTypeIdentifier() === TypeIdentifier.Map) {
				parent.getStreamPort().setStreamTypeChildToParent(stream);
			} else if (parent.getTypeIdentifier() === TypeIdentifier.Stream) {
				this.streamType.next(stream);
				const baseStreamType = stream.getBaseStream();
				if (!baseStreamType) {
					throw new Error(`${this.port.getOwnerName()}: insufficient stream type depth`);
				}
				parent.getStreamPort().setStreamTypeChildToParent(baseStreamType);
			} else {
				throw new Error(`${this.port.getOwnerName()}: unexpected port type, cannot be a parent`);
			}
		} else {
			this.setStreamTypeParentToChild(stream, false);
		}
	}

	public getStreamType(): StreamType | null {
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
	
	constructor (private portOwner: PortOwner) {
		
	}
	
}