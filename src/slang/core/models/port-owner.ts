/* tslint:disable:no-circular-imports */

import {StreamPortOwner} from "../stream";
import {SlangNode} from "./node";
import {GenericPortModel, PortModel, PortModelArgs} from "./port";

export abstract class PortOwner extends SlangNode {

	private readonly streamPortOwner: StreamPortOwner;

	protected constructor(parent: SlangNode, streamSource: boolean) {
		super(parent);
		this.streamPortOwner = new StreamPortOwner(this, streamSource);
		this.streamPortOwner.initialize();
	}

	public getPortIn(): PortModel | null {
		return this.scanChildNode(GenericPortModel, (p) => p.isDirectionIn()) || null;
	}

	public getPortOut(): PortModel | null {
		return this.scanChildNode(GenericPortModel, (p) => p.isDirectionOut()) || null;
	}

	public getPorts(): IterableIterator<PortModel> {
		return this.getChildNodes(GenericPortModel);
	}

	public getStreamPortOwner(): StreamPortOwner {
		return this.streamPortOwner;
	}

	protected abstract createPort(args: PortModelArgs): PortModel;

}
