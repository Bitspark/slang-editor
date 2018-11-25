import {SlangSubject, SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";
import {PortOwner} from "./nodes";
import {ConnectionComponent} from "../ui/components/connection";

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