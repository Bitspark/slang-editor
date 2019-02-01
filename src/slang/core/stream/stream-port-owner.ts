import {Subscription} from "rxjs";
import {GenericPortModel} from "../models/abstract/port";
import {PortOwner} from "../models/abstract/port-owner";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../models/abstract/utils/events";
import {StreamType} from "./stream-type";

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
