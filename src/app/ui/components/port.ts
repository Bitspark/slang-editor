import {attributes, dia} from "jointjs";
import {PortModel} from "../../model/port";

export class PortComponent implements dia.Element.Port {

    public readonly id: string;
    public readonly attrs: dia.Cell.Selectors;
    
    constructor(private port: PortModel, public readonly group: string) {
        this.id = `${port.getIdentity()}`;
        this.attrs = {
            '.sl-port': PortComponent.getPortAttributes(group, port.isDirectionIn()),
        };
    }
    
    // STATIC

    private static getPortAttributes(group: string, direction: boolean): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            fill: "cyan",
        };

        switch (group) {
            case "MainIn":
            case "MainOut":
                attrs.transform = "translate(0,-3)";
                break;

            case "Delegate":
                attrs.transform = `rotate(${(direction) ? 90 : -90})`;
                break;

        }

        return attrs;
    }
    
}