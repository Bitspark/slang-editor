import {BlackBox} from "./blackbox";
import {PortOwner} from "./port-owner";
import {Connections} from "./utils/connections";

export abstract class GenericDelegateModel<B extends BlackBox> extends PortOwner {
	protected constructor(parent: B, public readonly name: string, streamSource: boolean) {
		super(parent, streamSource);
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
