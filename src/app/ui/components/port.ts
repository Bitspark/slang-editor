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
        this.portElement.markup = PortComponent.getPortMarkup(port);
        this.portElement.attrs = {
            "path": PortComponent.getPortAttributes(parent.getGroupPosition(), port),
            "g": {
                magnet: true,
            },
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

    private static getPortShape(width: number, height: number): string {
        return `M ${-width / 2} ${-height / 2} ` +
            `L ${width / 2} ${-height / 2} ` +
            `L 0 ${height / 2} z`;
    }

    private static getPortMarkup(port: PortModel): string {
        const streamDepth = port.getStreamDepth();
        if (streamDepth < 0) {
            throw new Error(`stream depth cannot be negative`);
        }
        let markup = ``;
        for (let i = 0; i < streamDepth + 1; i++) {
            const factor = 1 - (i / (streamDepth + 1));
            const width = Styles.Port.width * factor;
            const height = Styles.Port.height * factor;
            const classes = ["sl-port"];
            if (i % 2 == 1) {
                classes.push(`sl-stripe`);
            } else {
                classes.push(`sl-type-${TypeIdentifier[port.getTypeIdentifier()].toLowerCase()}`);
            }
            markup += `<path class="${classes.join(" ")}" d="${PortComponent.getPortShape(width, height)}"></path>`;
        }
        return markup;
    }

    private static getPortAttributes(position: PortGroupPosition, port: PortModel): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            paintOrder: "stroke fill",
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
