/* tslint:disable:no-circular-imports */

import {IStreamPortOwner} from "../../stream/abstract";
import {SlangNode} from "./node";
import {GenericPortModel, PortModel, PortModelArgs} from "./port";

export abstract class PortOwner extends SlangNode {

	protected constructor(parent: SlangNode, private readonly streamPortOwner: IStreamPortOwner) {
		super(parent);
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

	public getStreamPortOwner(): IStreamPortOwner {
		return this.streamPortOwner;
	}

	protected abstract createPort(args: PortModelArgs): PortModel;

}
