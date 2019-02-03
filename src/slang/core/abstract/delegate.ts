import {BlackBox} from "./blackbox";
import {PortOwner} from "./port-owner";
import {IStreamPortOwner} from "./stream";
import {Connections} from "./utils/connections";

export abstract class GenericDelegateModel<B extends BlackBox> extends PortOwner {
	protected constructor(parent: B, private name: string, streamSource: boolean, streamPortCtor: new (portOwner: PortOwner, isSource: boolean) => IStreamPortOwner) {
		super(parent, streamSource, streamPortCtor);
	}

	public getName(): string {
		return this.name;
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnectionsTo());
		}

		return connections;
	}

	public getConnections(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnections());
		}

		return connections;
	}

	public isDelegate(): boolean {
		return true;
	}
}

export type DelegateModel = GenericDelegateModel<BlackBox>;
