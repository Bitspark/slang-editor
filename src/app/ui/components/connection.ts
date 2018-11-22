import {Connection} from "../../custom/connections";
import {BlackBox, PortOwner} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {dia} from "jointjs";
import {slangRouter} from "../link/router";
import {slangConnector} from "../link/connector";
import {Styles} from "../../../styles/studio";
import {PortModel} from "../../model/port";

const ConnectionLink = dia.Link.define("Connection", {
	router: slangRouter,
}, {
	toolMarkup: [
		"<g class='link-tool'>",
		"<g class='tool-remove' event='tool:remove'>",
		"<circle r='11' fill='red' />",
		"<path transform='scale(.8) translate(-16, -16)' d='M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z' fill='white' />",
		"<title>Disconnect</title>",
		"</g>",
		"</g>",].join(""),
	arrowheadMarkup: [
		"<g>",
		"</g>"].join(""),
});

const GhostConnectionLink = dia.Link.define("Connection", {
	router: slangRouter,
}, {
	toolMarkup: [
		"<g>",
		"</g>",].join(""),
});

export class ConnectionComponent {

	private readonly link: dia.Link;
	private readonly id: string;

	constructor(private graph: dia.Graph, private connection: Connection) {
		const ownerIds = ConnectionComponent.getBoxOwnerIds(connection);
		this.id = ConnectionComponent.getLinkId(connection);
		this.link = new ConnectionLink({
			id: this.id,
			source: {
				id: ownerIds[0],
				port: connection.source.getIdentity(),
			},
			target: {
				id: ownerIds[1],
				port: connection.destination.getIdentity(),
			},
			z: -1,
			attrs: {
				".connection": {
					"stroke-opacity": Styles.Connection.Ghost.strokeOpacity,
				},
			},
		} as any);
		this.link.transition("attrs/.connection/stroke-opacity", Styles.Connection.Ordinary.strokeOpacity, {
			duration: 360,
			timingFunction: t => {
				return Math.sqrt(t);
			}
		});
		this.refresh();
		this.link.addTo(graph);
	}

	public refresh(): void {
		ConnectionComponent.refresh(this.connection.source, this.connection.destination, this.link);
	}

	public getId(): string {
		return this.id;
	}

	public getConnection(): Connection {
		return this.connection;
	}
	
	public getLink(): dia.Link {
		return this.link;
	}

	// STATIC

	public static createGhostLink(sourcePort: PortModel): dia.Link {
		const link = new GhostConnectionLink({
			attrs: {
				".connection": {
					"stroke-opacity": Styles.Connection.Ghost.strokeOpacity,
				}
			},
		} as any);
		ConnectionComponent.refresh(sourcePort, null, link);
		return link;
	}

	private static refresh(sourcePort: PortModel, destinationPort: PortModel | null, link: dia.Link) {
		const stream = sourcePort.getStreamType();
		const lines = stream ? stream.getStreamDepth() : 1;

		link.connector(slangConnector(sourcePort, destinationPort, lines));
		link.attr(".connection/stroke-width", lines === 1 ? 2 : 1);
		link.attr(".connection/vector-effect", Styles.Connection.Ordinary.vectorEffect);
		if (sourcePort.isMarkedUnreachable()) {
			link.attr(".connection/stroke", "#ff00ff");
		} else if (sourcePort.isMarkedDeleted()) {
			link.attr(".connection/stroke", "#ff0000");
		} else {
			link.attr(".connection/stroke", Styles.Connection.Ordinary.stroke(sourcePort.getTypeIdentifier()));
		}
		if (!stream) {
			link.attr(".connection/stroke-dasharray", 5);
		} else {
			if (stream.getRootStream().isPlaceholder()) {
				link.attr(".connection/stroke-dasharray", 5);
			} else if (stream.isPlaceholder()) {
				link.attr(".connection/stroke-dasharray", 1);
			} else {
				link.removeAttr(".connection/stroke-dasharray");
			}
		}
	}

	public static getBoxOwnerIds(connection: Connection): [string, string] {
		const sourceOwner = connection.source.getAncestorNode(BlackBox);
		const destinationOwner = connection.destination.getAncestorNode(BlackBox);

		if (!sourceOwner) {
			throw new Error(`no source owner found`);
		}
		if (!destinationOwner) {
			throw new Error(`no destination owner found`);
		}

		let sourceIdentity = sourceOwner.getIdentity();
		if (sourceOwner instanceof BlueprintModel) {
			sourceIdentity = connection.source.getAncestorNode(PortOwner)!.getIdentity() + "_in";
		}

		let destinationIdentity = destinationOwner.getIdentity();
		if (destinationOwner instanceof BlueprintModel) {
			destinationIdentity = connection.destination.getAncestorNode(PortOwner)!.getIdentity() + "_out";
		}

		return [sourceIdentity, destinationIdentity];
	}

	public static getLinkId(connection: Connection): string {
		return `${connection.source.getIdentity()}:${connection.destination.getIdentity()}`;
	}

	public static findLink(graph: dia.Graph, connection: Connection): dia.Link | undefined {
		const linkId = ConnectionComponent.getLinkId(connection);
		const link = graph.getCell(linkId);

		if (!link) {
			return undefined;
		}

		if (link.isLink()) {
			return link as dia.Link;
		} else {
			throw new Error(`connection cell not of type link: ${linkId}`);
		}
	}

}