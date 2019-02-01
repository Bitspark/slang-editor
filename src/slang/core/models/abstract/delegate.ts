/* tslint:disable:no-circular-imports */

import {IStreamPortOwner} from "../../stream/abstract";
import {BlackBox} from "./blackbox";
import {PortOwner} from "./port-owner";
import {Connections} from "./utils/connections";

export type DelegateModel = GenericDelegateModel<BlackBox>;

export abstract class GenericDelegateModel<B extends BlackBox> extends PortOwner {
	protected constructor(parent: B, private name: string, streamPortOwner: IStreamPortOwner) {
		super(parent, streamPortOwner);
	}

	public getName(): string {
		return this.name;
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		// First, handle operator out-ports
		if (this.getPortOut()) {
			connections.addConnections(this.getPortOut()!.getConnectionsTo());
		}

		return connections;
	}
}
