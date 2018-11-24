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
			
			baseStream.subscribeNestingChanged(() => {
				this.nestingChanged.next();
			});
			
			baseStream.subscribeMarkUnreachable(() => {
				this.markUnreachable();
			});
			baseStream.subscribeRemoveUnreachable(() => {
				this.removeUnreachable();
			});
		}
	}
	
	public getSource(): PortOwner | null {
		return this.source;
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

			this.baseStream.subscribeMarkUnreachable(() => {
				this.markUnreachable();
			});
			this.baseStream.subscribeRemoveUnreachable(() => {
				this.removeUnreachable();
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
	
	public startGarbageCollection() {
		this.getRootStream().startGarbageCollectionRoot();
	}
	
	private startGarbageCollectionRoot() {
		this.markUnreachable();
		
		if (this.source) {
			this.source.markReachable(true);
		} else {
			console.log("no source");
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
	
	public toString(): string {
		const source = this.source;
		const me = (this.placeholder ? "PH" : "S") + "[" + ((!!source) ? source!.getScopedIdentity() : "null") + "]";
		
		if (!!this.baseStream) {
			return this.baseStream.toString() + ">" + me;
		}
		return me;
	}

}