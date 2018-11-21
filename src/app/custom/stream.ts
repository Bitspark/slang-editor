import {SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";
import {PortOwner} from "./nodes";

export class StreamType {

	private readonly markUnreachableRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly removeUnreachableRequested = new SlangSubjectTrigger("remove-unreachable");
	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	constructor(private baseStream: StreamType | null, private source: PortOwner | null, private placeholder: boolean) {
		if (baseStream) {
			if (baseStream.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}
			baseStream.subscribeMarkUnreachable(() => {
				this.markUnreachable();
			});
			baseStream.subscribeRemoveUnreachable(() => {
				this.removeUnreachable();
			});
			baseStream.subscribeNestingChanged(() => {
				this.nestingChanged.next();
			});
		}
	}

	public isPlaceholder(): boolean {
		return this.placeholder;
	}

	public createSubStream(sourcePort: PortOwner, placeholder: boolean): StreamType {
		if (this.placeholder && !placeholder) {
			throw new Error(`sub streams of placeholder streams must be placeholders as well`);
		}
		return new StreamType(this, sourcePort, placeholder);
	}

	public getBaseStream(): StreamType | null {
		if (!this.baseStream && this.placeholder) {
			this.baseStream = new StreamType(null, null, true);
			this.baseStream.subscribeNestingChanged(() => {
				this.nestingChanged.next();
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

	public collectGarbage(): void {
		if (this.source) {
			const source = this.source;
			this.markUnreachable();
			setTimeout(() => {
				source.setBaseStream(this);
				setTimeout(() => {
					this.removeUnreachable();
				}, 500);
			}, 500);
		} else {
			this.markUnreachable();
			setTimeout(() => {
				this.removeUnreachable();
			}, 500);
		}
	}

	private markUnreachable(): void {
		this.markUnreachableRequested.next();
	}

	private removeUnreachable(): void {
		this.removeUnreachableRequested.next();
	}

	public subscribeMarkUnreachable(cb: () => void): Subscription {
		return this.markUnreachableRequested.subscribe(cb);
	}

	public subscribeRemoveUnreachable(cb: () => void): Subscription {
		return this.removeUnreachableRequested.subscribe(cb);
	}

	public subscribeNestingChanged(cb: () => void): Subscription {
		return this.nestingChanged.subscribe(cb);
	}

}