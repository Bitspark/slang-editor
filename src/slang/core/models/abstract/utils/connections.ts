/* tslint:disable:no-circular-imports */

import {PortModel} from "../port";

export interface IConnection {
	source: PortModel;
	destination: PortModel;
}

export class Connections {
	private connections: IConnection[] = [];

	public getIterator(): IterableIterator<IConnection> {
		return this.connections.values();
	}

	public addConnection(connection: IConnection) {
		this.connections.push(connection);
	}

	public addConnections(connections: Connections) {
		for (const connection of connections.getIterator()) {
			this.connections.push(connection);
		}
	}

	public forEach(cb: (connection: IConnection) => void): void {
		for (const connection of this.connections) {
			cb(connection);
		}
	}

}
