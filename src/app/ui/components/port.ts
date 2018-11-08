import {attributes, dia, g} from "jointjs";
import {PortModel} from "../../model/port";
import {PortGroupComponent, PortGroupPosition} from "./port-group";
import {TypeIdentifier} from "../../custom/type";

/**
 * Component representing a Slang port.
 */
export class PortComponent {

    private position: g.PlainPoint | undefined;
    private readonly portElement: dia.Element.Port = {};

    constructor(private readonly port: PortModel, private readonly parent: PortGroupComponent) {
        this.portElement.id = `${port.getIdentity()}`;
        this.portElement.group = parent.getName();
        this.portElement.attrs = {
            ".sl-port": PortComponent.getPortAttributes(parent.getGroupPosition(), port),
        };
    }

    public getPortElement(): dia.Element.Port {
        return this.portElement;
    }

    public getModel(): PortModel {
        return this.port;
    }

    public setPosition(position: g.PlainPoint) {
        this.position = position;
    }

    public getPosition(): g.PlainPoint | undefined {
        return this.position;
    }

    public getGroup(): PortGroupComponent {
        return this.parent;
    }

    // STATIC:

    /**
     * Width of the visible port shape.
     */
    private static readonly portWidth = 7;

    /**
     * Height of the visible port shape.
     */
    private static readonly portHeight = 21;

    private static getPortAttributes(position: PortGroupPosition, port: PortModel): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            paintOrder: "stroke fill",
            d:
                `M ${-PortComponent.portWidth / 2} ${-PortComponent.portHeight / 2} ` +
                `L ${PortComponent.portWidth / 2} ${-PortComponent.portHeight / 2} ` +
                `L 0 ${PortComponent.portHeight / 2} z`,
            magnet: true,
            stroke: "gray",
            strokeWidth: 3,
            class: `sl-port sl-type-${TypeIdentifier[port.getTypeIdentifier()].toLowerCase()}`,
        };

        switch (position) {
            case "top":
                attrs.transform = "";
                break;
            case "right":
                attrs.transform = `rotate(${port.isDirectionIn() ? 90 : -90})`;
                break;
            case "bottom":
                attrs.transform = "";
                break;
            case "left":
                attrs.transform = `rotate(${port.isDirectionIn() ? 90 : -90})`;
                break;
        }

        return attrs;
    }
}
