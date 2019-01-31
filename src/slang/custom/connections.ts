import {PortModel} from "../model/port";

export interface Connection {
	source: PortModel;
	destination: PortModel;
}

export class Connections {
	private connections: Connection[] = [];

	public getIterator(): IterableIterator<Connection> {
		return this.connections.values();
	}

	public addConnection(connection: Connection) {
		this.connections.push(connection);
	}

	public addConnections(connections: Connections) {
		for (const connection of connections.getIterator()) {
			this.connections.push(connection);
		}
	}

	public forEach(cb: (connection: Connection) => void): void {
		for (const connection of this.connections) {
			cb(connection);
		}
	}

}
