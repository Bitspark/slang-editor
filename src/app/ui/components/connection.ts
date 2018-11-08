import {Connection} from "../../custom/connections";
import {BlackBox, PortOwner} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {dia} from "jointjs";
import {slangRouter} from "../link/router";
import {slangConnector} from "../link/connector";
import {TypeIdentifier} from "../../custom/type";
import {Styles} from "../../../styles/studio";

const ConnectionLink = dia.Link.define("Connection", {
    router: slangRouter,
    connector: slangConnector,
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
    connector: slangConnector,
}, {
    toolMarkup: [
        "<g>",
        "</g>",].join(""),
});

export class ConnectionComponent {

    private readonly link: dia.Link;
    private readonly id: string;

    constructor(private graph: dia.Graph, connection: Connection) {
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
            attrs: {
                ".connection": {
                    stroke: Styles.Connection.Ordinary.stroke(connection.source.getTypeIdentifier()),
                    "stroke-width": Styles.Connection.Ordinary.strokeWidth,
                    "stroke-opacity": Styles.Connection.Ghost.strokeOpacity,
                    "vector-effect": Styles.Connection.Ordinary.vectorEffect,
                },
            },
            z: -1,
        } as any);
        this.link.transition("attrs/.connection/stroke-opacity", Styles.Connection.Ordinary.strokeOpacity, {
            duration: 360,
            timingFunction: t => {
                return Math.sqrt(t);
            }
        });
        this.link.addTo(graph);
    }

    public getLink(): dia.Link {
        return this.link;
    }

    public getId(): string {
        return this.id;
    }

    public static createGhostLink(type: TypeIdentifier): dia.Link {
        return new GhostConnectionLink({
            attrs: {
                ".connection": {
                    stroke: Styles.Connection.Ghost.stroke(type),
                    "stroke-width": Styles.Connection.Ghost.strokeWidth,
                    "stroke-opacity": Styles.Connection.Ghost.strokeOpacity,
                    "vector-effect": Styles.Connection.Ghost.vectorEffect,
                }
            }
        } as any);
    }

    public static getBoxOwnerIds(connection: Connection): [string, string] {
        const sourceOwner = connection.source.getAncestorNode<BlackBox>(BlackBox);
        const destinationOwner = connection.destination.getAncestorNode<BlackBox>(BlackBox);

        if (!sourceOwner) {
            throw new Error(`no source owner found`);
        }
        if (!destinationOwner) {
            throw new Error(`no destination owner found`);
        }

        let sourceIdentity = sourceOwner.getIdentity();
        if (sourceOwner instanceof BlueprintModel) {
            sourceIdentity = connection.source.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_in";
        }

        let destinationIdentity = destinationOwner.getIdentity();
        if (destinationOwner instanceof BlueprintModel) {
            destinationIdentity = connection.destination.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_out";
        }

        return [sourceIdentity, destinationIdentity];
    }

    public static getLinkId(connection: Connection): string {
        return `${connection.source.getIdentity()}>${connection.destination.getIdentity()}`;
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