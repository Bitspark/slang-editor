import {dia} from "jointjs";

import {Styles} from "../../../styles/studio";
import {BlackBoxModel} from "../../core/abstract/blackbox";
import {PortModel} from "../../core/abstract/port";
import {PortOwner} from "../../core/abstract/port-owner";
import {StreamType} from "../../core/abstract/stream";
import {Connection} from "../../core/abstract/utils/connections";
import {BlueprintModel} from "../../core/models/blueprint";
import {TypeIdentifier} from "../../definitions/type";
import {slangConnector} from "../link/connector";
import {slangRouter} from "../link/router";
import {tid2css} from "../utils";
import {Canvas} from "../canvas/base";

import {ShapeCanvasElement} from "./base";

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

const ghostConnectionLink = dia.Link.define("GhostConnection", {
	router: slangRouter,
}, {
	toolMarkup: [
		"<g>",
		"</g>"].join(""),
});

export class ConnectionElement extends ShapeCanvasElement {

	// STATIC

	public static createGhostLink(sourcePort: PortModel): dia.Link {
		const link = new ghostConnectionLink({
			attrs: {
				".connection": {
					"stroke-opacity": Styles.Connection.GhostConnection.strokeOpacity,
				},
			},
		} as any);
		ConnectionElement.refresh(sourcePort, null, link);
		return link;
	}

	public static getBoxOwnerIds(connection: Connection): [string, string] {
		const sourceOwner = connection.source.getAncestorNode(BlackBoxModel);
		const destinationOwner = connection.destination.getAncestorNode(BlackBoxModel);

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

	public static findLink(paperView: Canvas, connection: Connection): dia.Link | undefined {
		const linkId = ConnectionElement.getLinkId(connection);
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

		const cssClasses = ["sl-connection"];

		link.connector(slangConnector(sourcePort, destinationPort, lines));
		if (destinationPort && destinationPort.getTypeIdentifier() === TypeIdentifier.Trigger) {
			cssClasses.push(tid2css(TypeIdentifier.Trigger));
		} else if (sourcePort.isGenericLike() && !sourcePort.getType().isElementaryPort()) {
			cssClasses.push(tid2css("ghost"));
		} else {
			cssClasses.push(tid2css(sourcePort.getTypeIdentifier()));
		}

		link.attr(".connection/class", cssClasses.join(" "));
		link.attr(".connection/stroke-width", lines === 1 ? Styles.Connection.OrdinaryConnection.strokeWidth : 1);
		link.attr(".connection-wrap/class", "sl-connection-wrap");

		if (!stream) {
			return;
		}

		if (stream.hasPlaceholderAncestor()) {
			link.attr(".connection/stroke-dasharray", 1);
		} else {
			link.removeAttr(".connection/stroke-dasharray");
		}
	}

	protected readonly cssAttr = ".connection-wrap/class";
	protected shape: dia.Link;
	private readonly id: string;

	constructor(paperView: Canvas, private connection: Connection) {
		super(paperView, {x: 0, y: 0});
		const ownerIds = ConnectionElement.getBoxOwnerIds(connection);
		this.id = ConnectionElement.getLinkId(connection);
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
					strokeWidth: Styles.Connection.OrdinaryConnection.strokeWidth,
					strokeOpacity: Styles.Connection.OrdinaryConnection.strokeOpacity,
					cursor: "pointer",
				},
				".connection-wrap": {
					cursor: "pointer",
				},
				".link-tools": {
					display: "none",
				},
			},
		} as any);

		this.refresh();

		[[connection.source, connection.destination], [connection.destination, connection.source]].forEach(([port, other]) => {
			port.getStreamPort().subscribeRefreshStreamType((stream) => {
				if (!StreamType.refreshActive || !port.isConnectedWith(other)) {
					return;
				}
				this.refresh();
				if (!stream) {
					return;
				}
				stream.subscribeNestingChanged(() => {
					this.refresh();
				});
			});
		});
	}

	public refresh(): void {
		ConnectionElement.refresh(this.connection.source, this.connection.destination, this.shape);
		if (!this.getShape().graph) {
			this.render();
		}
	}

	public getId(): string {
		return this.id;
	}

	public getConnection(): Connection {
		return this.connection;
	}
}
