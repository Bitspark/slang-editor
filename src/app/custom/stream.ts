import {PortModel} from "../model/port";

export class StreamType {

	constructor(private baseStreamType: StreamType | null, private sourcePort: PortModel) {
		if (baseStreamType) {
			if (baseStreamType.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}
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

}