import {attributes, dia, g} from "jointjs";
import {PortModel} from "../../model/port";
import {BlackBox, PortOwner} from "../../custom/nodes";
import {GenericDelegateModel} from "../../model/delegate";

export enum PortDirection {
    In,
    Out,
}

export class PortComponent implements dia.Element.Port {

    public readonly id: string;
    public readonly group: string;
    public readonly attrs: dia.Cell.Selectors;

    // Careful: For some reason we must not add any properties other than the above to this class
    // Otherwise we get performance issues
    // TODO: Investigate

    constructor(port: PortModel, group: string) {
        this.id = `${port.getIdentity()}`;
        this.group = group;
        this.attrs = {
            '.sl-port': PortComponent.getPortAttributes(group, port.isDirectionIn()),
        };
    }

    // STATIC ONLY:

    private static getPortAttributes(group: string, direction: boolean): attributes.SVGAttributes {
        const attrs: attributes.SVGAttributes = {
            fill: "cyan",
        };

        switch (group) {
            case "MainIn":
            case "MainOut":
                attrs.transform = "translate(0,-3)";
                break;
            default:
                // Delegate
                attrs.transform = `rotate(${(direction) ? 90 : -90})`;
                break;
        }

        return attrs;
    }

}

export class PortGroupComponent implements dia.Element.PortGroup {

    public position?: dia.Element.PositionType;
    public markup?: string;
    public attrs?: dia.Cell.Selectors;

    // Careful: For some reason we must not add any properties other than the above to this class
    // Otherwise we get performance issues
    // TODO: Investigate

    constructor(portOwner: PortOwner, direction: PortDirection, start: number, width: number) {
        switch (direction) {
            case PortDirection.In:
                if (portOwner instanceof BlackBox) {
                    this.position = PortGroupComponent.layoutFunction("top", start, width) as any;
                    this.markup = "<path class='sl-srv-main sl-port sl-port-in' d=''></path>";
                    this.attrs = {
                        ".sl-srv-main.sl-port": PortGroupComponent.portAttributes,
                    };
                } else if (portOwner instanceof GenericDelegateModel) {
                    this.position = PortGroupComponent.layoutFunction("right", start, width) as any;
                    this.markup = "<path class='sl-dlg sl-port sl-port-in' d=''></path>";
                    this.attrs = {
                        ".sl-dlg.sl-port": PortGroupComponent.portAttributes,
                    };
                }
                break;
            case PortDirection.Out:
                if (portOwner instanceof BlackBox) {
                    this.position = PortGroupComponent.layoutFunction("bottom", start, width) as any;
                    this.markup = "<path class='sl-srv-main sl-port sl-port-out' d=''></path>";
                    this.attrs = {
                        ".sl-srv-main.sl-port": PortGroupComponent.portAttributes
                    };
                } else if (portOwner instanceof GenericDelegateModel) {
                    this.position = PortGroupComponent.layoutFunction("right", start, width) as any;
                    this.markup = "<path class='sl-dlg sl-port sl-port-out' d=''></path>";
                    this.attrs = {
                        ".sl-dlg.sl-port": PortGroupComponent.portAttributes,
                    };
                }
                break;
        }
    }

    // STATIC ONLY:

    /**
     * Spacing between ports. Two ports must not be closer to each other than this value.
     */
    private static readonly portSpacing = 15;
    
    /**
     * Width of the visible port shape.
     */
    private static readonly portWidth = 10;
    
    /**
     * Height of the visible port shape.
     */
    private static readonly portHeight = 8;

    /**
     * SVG attributes for the port shape.
     */
    private static readonly portAttributes: attributes.SVGAttributes = {
        paintOrder: "stroke fill",
        d: `M 0 0 L ${PortGroupComponent.portWidth} 0 L ${PortGroupComponent.portWidth / 2} ${PortGroupComponent.portHeight} z`,
        magnet: true,
        stroke: "gray",
        strokeWidth: 3
    };

    private static layoutFunction(position: "top" | "bottom" | "left" | "right", offset: number, space: number): (ports: Array<any>, elBBox: g.Rect, opt: any) => Array<g.Point> {
        return function (ports: Array<any>, elBBox: g.Rect, opt: any): Array<g.Point> {
            return ports.map((port: any, index: number, ports: Array<any>) => {
                const count = ports.length;

                let total = 0;
                switch (position) {
                    case "top":
                    case "bottom":
                        total = elBBox.width;
                        break;
                    case "left":
                    case "right":
                        total = elBBox.height;
                        break;
                }

                const portSpaceAbs = PortGroupComponent.portWidth;
                const lengthAbs = 
                    count * portSpaceAbs + 
                    (count - 1) * PortGroupComponent.portSpacing;
                const spaceAbs = space * total;
                const offsetAbs = offset * total;
                const positionAbs = 
                    offsetAbs + 
                    index * (portSpaceAbs + PortGroupComponent.portSpacing) +
                    (spaceAbs - lengthAbs) / 2;

                switch (position) {
                    case "top":
                        return new g.Point(positionAbs, 0);
                    case "bottom":
                        return new g.Point(positionAbs, elBBox.height);
                    case "left":
                        return new g.Point(0, positionAbs);
                    case "right":
                        return new g.Point(elBBox.width, positionAbs);
                }
            });
        };
    }

}