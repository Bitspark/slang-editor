import {dia} from "jointjs";

import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../core/model/abstract/blackbox";
import {PortModel} from "../../core/model/abstract/port";
import {PortOwner} from "../../core/model/abstract/port-owner";
import {Connection} from "../../core/model/abstract/utils/connections";
import {BlueprintModel} from "../../core/model/blueprint";
import {StreamType} from "../../core/stream/stream";
import {TypeIdentifier} from "../../definitions/type";
import {slangConnector} from "../link/connector";
import {slangRouter} from "../link/router";
import {PaperView} from "../views/paper-view";
import {CellComponent} from "./base";

const connectionLink = dia.Link.define("Connection", {
	router: slangRouter,
}, {
	toolMarkup: [
		"<g class='link-tool'>",
		"<g class='tool-remove' event='tool:remove'>",
		"<circle r='11' fill='red' />",
		"<path transform='scale(.8) translate(-16, -16)' d='M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z' fill='white' />",
		"<title>Disconnect</title>",
		"</g>",
		"</g>"].join(""),
	arrowheadMarkup: [
		"<g>",
		"</g>"].join(""),
});

const ghostConnectionLink = dia.Link.define("Connection", {
	router: slangRouter,
}, {
	toolMarkup: [
		"<g>",
		"</g>"].join(""),
});

export class ConnectionComponent extends CellComponent {

	// STATIC

	public static createGhostLink(sourcePort: PortModel): dia.Link {
		const link = new ghostConnectionLink({
			attrs: {
				".connection": {
					"stroke-opacity": Styles.Connection.GhostConnection.strokeOpacity,
				},
			},
		} as any);
		ConnectionComponent.refresh(sourcePort, null, link);
		return link;
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

	public static findLink(paperView: PaperView, connection: Connection): dia.Link | undefined {
		const linkId = ConnectionComponent.getLinkId(connection);
		const link = paperView.getCell(linkId);

		if (!link) {
			return undefined;
		}

		if (link.isLink()) {
			return link as dia.Link;
		}

		throw new Error(`connection cell not of type link: ${linkId}`);
	}

	private static refresh(sourcePort: PortModel, destinationPort: PortModel | null, link: dia.Link) {
		const stream = sourcePort.getStreamPort().getStreamType();
		const lines = stream ? stream.getStreamDepth() : 1;

		link.connector(slangConnector(sourcePort, destinationPort, lines));
		if (destinationPort && destinationPort.getTypeIdentifier() === TypeIdentifier.Trigger) {
			link.attr(".connection/stroke", Styles.Connection.OrdinaryConnection.stroke(TypeIdentifier.Trigger));
		} else if (sourcePort.isGenericLike() && !sourcePort.getType().isElementaryPort()) {
			link.attr(".connection/stroke", Styles.Connection.OrdinaryConnection.stroke("ghost"));
		} else {
			link.attr(".connection/stroke", Styles.Connection.OrdinaryConnection.stroke(sourcePort.getTypeIdentifier()));
		}
		link.attr(".connection/stroke-width", lines === 1 ? 2 : 1);
		link.attr(".connection/vector-effect", Styles.Connection.OrdinaryConnection.vectorEffect);

		if (stream) {
			if (stream.hasPlaceholderAncestor()) {
				link.attr(".connection/stroke-dasharray", 1);
			} else {
				link.removeAttr(".connection/stroke-dasharray");
			}
		}
	}

	protected shape: dia.Link;
	private readonly id: string;

	constructor(paperView: PaperView, private connection: Connection) {
		super(paperView, {x: 0, y: 0});
		const ownerIds = ConnectionComponent.getBoxOwnerIds(connection);
		this.id = ConnectionComponent.getLinkId(connection);
		this.shape = new connectionLink({
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
					"stroke-opacity": Styles.Connection.GhostConnection.strokeOpacity,
				},
			},
		} as any);
		this.shape.transition("attrs/.connection/stroke-opacity", Styles.Connection.OrdinaryConnection.strokeOpacity, {
			duration: 360,
			timingFunction: (t) => {
				return Math.sqrt(t);
			},
		});
		this.refresh();
		this.render();

		[[connection.source, connection.destination], [connection.destination, connection.source]].forEach(([port, other]) => {
			port.getStreamPort().subscribeRefreshStreamType((stream) => {
				if (StreamType.refreshActive && port.isConnectedWith(other)) {
					this.refresh();
					if (stream) {
						stream.subscribeNestingChanged(() => {
							this.refresh();
						});
					}
				}
			});
		});
	}

	public refresh(): void {
		if (!this.getShape().graph) {
			this.render();
		}
		ConnectionComponent.refresh(this.connection.source, this.connection.destination, this.shape);
	}

	public getId(): string {
		return this.id;
	}

	public getConnection(): Connection {
		return this.connection;
	}

}
