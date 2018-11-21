import {PortModel} from "../model/port";
import {SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";

export class StreamType {

	private readonly markUnreachableRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly removeUnreachableRequested = new SlangSubjectTrigger("remove-unreachable");
	private readonly nestingChanged = new SlangSubjectTrigger("nesting");
	
	constructor(private baseStreamType: StreamType | null, private sourcePort: PortModel | null) {
		if (baseStreamType) {
			if (baseStreamType.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}
			baseStreamType.subscribeMarkUnreachable(() => {
				this.markUnreachable();
			});
			baseStreamType.subscribeRemoveUnreachable(() => {
				this.removeUnreachable();
			});
			baseStreamType.subscribeNestingChanged(() => {
				this.nestingChanged.next();
			});
		}
	}
	
	public isVirtual(): boolean {
		return !this.sourcePort;
	}

	public createSubStream(sourcePort: PortModel | null): StreamType {
		return new StreamType(this, sourcePort);
	}

	public getBaseStreamType(): StreamType | null {
		if (!this.baseStreamType && this.isVirtual()) {
			const stream = new StreamType(null, null);
			this.baseStreamType = stream;
			this.nestingChanged.next();
			return stream;
		}
		return this.baseStreamType;
	}
	
	public getRootStream(): StreamType {
		if (!this.baseStreamType) {
			return this;
		}
		return this.baseStreamType.getRootStream();
	}

	public getStreamDepth(): number {
		if (this.baseStreamType) {
			return this.baseStreamType.getStreamDepth() + 1;
		}
		return 1;
	}

	private hasAncestor(stream: StreamType): boolean {
		if (stream === this) {
			return true;
		}
		if (this.baseStreamType) {
			return this.baseStreamType.hasAncestor(stream);
		}
		return false;
	}
	
	public collectGarbage(): void {
		if (!this.sourcePort) {
			return;
		}
		this.markUnreachable();
		this.sourcePort.setSubStreamTypes(this);
		this.removeUnreachable();
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