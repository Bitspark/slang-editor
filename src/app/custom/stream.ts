import {PortModel} from "../model/port";
import {SlangSubjectTrigger} from "./events";
import {Subscription} from "rxjs";

export class StreamType {

	private markUnreachableRequested: SlangSubjectTrigger;
	private removeUnreachableRequested: SlangSubjectTrigger;
	
	constructor(private baseStreamType: StreamType | null, private sourcePort: PortModel) {
		this.markUnreachableRequested = new SlangSubjectTrigger("mark-unreachable");
		this.removeUnreachableRequested = new SlangSubjectTrigger("remove-unreachable");
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
		}
	}

	public createSubStream(sourcePort: PortModel): StreamType {
		return new StreamType(this, sourcePort);
	}

	public getBaseStreamType(): StreamType | null {
		return this.baseStreamType;
	}

	public getSourcePort(): PortModel {
		return this.sourcePort;
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

}