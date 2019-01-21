import {PortModel} from "../model/port";

export interface Connection {
	source: PortModel
	destination: PortModel
}

export class Connections implements Iterable<Connection> {
	private connections: Array<Connection> = [];

	constructor() {
	}

	public add(connection: Connection) {
		this.connections.push(connection);
	}

	public addAll(connections: Iterable<Connection>) {
		for (const connection of connections) {
			this.connections.push(connection);
		}
	}

	public forEach(cb: (connection: Connection) => void): void {
		for (const connection of this.connections) {
			cb(connection);
		}
	}

	[Symbol.iterator](): IterableIterator<Connection> {
		return this.connections.values();
	}

}