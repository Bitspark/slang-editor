import {attributes, dia, g} from "jointjs";
import {PortModel} from "../../model/port";
import {PortGroupComponent, PortGroupPosition} from "./port-group";
import {TypeIdentifier} from "../../custom/type";
import {Styles} from "../../../styles/studio";

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

    private static getPortAttributes(position: PortGroupPosition, port: PortModel): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            paintOrder: "stroke fill",
            d: Styles.Port.shape,
            magnet: true,
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
