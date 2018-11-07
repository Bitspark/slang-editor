import {attributes, dia, g} from "jointjs";
import {PortModel} from "../../model/port";
import {PortGroupComponent, PortGroupPosition} from "./port-group";

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
            ".sl-port": PortComponent.getPortAttributes(parent.getGroupPosition(), port.isDirectionIn()),
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

    private static getPortAttributes(position: PortGroupPosition, directionIn: boolean): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            fill: "cyan",
        };

        switch (position) {
            case "top":
                attrs.transform = "";
                break;
            case "right":
                attrs.transform = `rotate(${directionIn ? 90 : -90})`;
                break;
            case "bottom":
                attrs.transform = "";
                break;
            case "left":
                attrs.transform = `rotate(${directionIn ? 90 : -90})`;
                break;
        }

        return attrs;
    }
}
