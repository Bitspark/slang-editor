import {dia} from "jointjs";

import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../core/abstract/blackbox";
import {PortModel} from "../../core/abstract/port";
import {PortOwner} from "../../core/abstract/port-owner";
import {StreamType} from "../../core/abstract/stream";
import {Connection} from "../../core/abstract/utils/connections";
import {BlueprintModel} from "../../core/models/blueprint";
import {TypeIdentifier} from "../../definitions/type";
import {slangConnector} from "../link/connector";
import {slangRouter} from "../link/router";
import {tid2css} from "../utils";
import {PaperView} from "../views/paper-view";

import {CellComponent} from "./base";

const connectionLink = dia.Link.define("Connection", {
	router: slangRouter,
}, {
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
		link.attr(".connection/stroke-width", lines === 1 ? 2 : 1);

		if (!stream) {
			return;
		}

		if (stream.hasPlaceholderAncestor()) {
			link.attr(".connection/stroke-dasharray", 1);
		} else {
			link.removeAttr(".connection/stroke-dasharray");
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
					strokeOpacity: Styles.Connection.GhostConnection.strokeOpacity,
				},
				".tool-remove": paperView.isReadOnly ? {
					display: "none",
				} : undefined,
			},
		} as any);
		this.shape.transition("attrs/.connection/stroke-opacity", Styles.Connection.OrdinaryConnection.strokeOpacity, {
			duration: 360,
			timingFunction: (t) => {
				return Math.sqrt(t);
			},
		});

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
