import {attributes, dia, g, shapes} from "jointjs";
import {BlueprintPortModel, OperatorPortModel, PortModel} from "../../model/port";
import {TypeIdentifier} from "../../custom/type";

export type PortGroupPosition = "top" | "right" | "bottom" | "left";

function createPortItems(parent: PortGroupComponent, position: PortGroupPosition, port: PortModel): Array<PortComponent> {
    let portItems: Array<PortComponent> = [];

    switch (port.getTypeIdentifier()) {
        case TypeIdentifier.Map:
            if (port.isCollapsed()) {
                portItems.push(new PortComponent(port, parent));
                break;
            }
            for (const [, each] of port.getMapSubs()) {
                portItems.push.apply(portItems, createPortItems(parent, position, each));
            }
            break;

        case TypeIdentifier.Stream:
            portItems.push.apply(portItems, createPortItems(parent, position, port.getStreamSub()));
            break;

        default:
            portItems.push(new PortComponent(port, parent));
    }
    return portItems;
}

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

/**
 * A component for which there is no directly corresponding Slang model.
 * It can be thought of a component that represents a port which has no parent port but is the topmost ports.
 * Currently these are main in- and out-ports and delegate in- and out-ports.
 */
export class PortGroupComponent {

    private readonly ports: Array<PortComponent> = [];
    private parentElement: dia.Element | null;
    private portGroupElement: dia.Element.PortGroup = {};

    constructor(private graph: dia.Graph,
                private readonly name: string,
                private readonly port: PortModel,
                private readonly groupPosition: PortGroupPosition,
                start: number,
                width: number) {
        switch (groupPosition) {
            case "top":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "top", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-srv-main sl-port sl-port-in' d=''></path>";
                this.portGroupElement.attrs = {
                    ".sl-srv-main.sl-port": PortGroupComponent.portAttributes,
                };
                break;
            case "right":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "right", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-dlg sl-port sl-port-in' d=''></path>";
                this.portGroupElement.attrs = {
                    ".sl-dlg.sl-port": PortGroupComponent.portAttributes,
                };
                break;
            case "bottom":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "bottom", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-srv-main sl-port sl-port-out' d=''></path>";
                this.portGroupElement.attrs = {
                    ".sl-srv-main.sl-port": PortGroupComponent.portAttributes
                };
                break;
            case "left":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "left", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-dlg sl-port sl-port-out' d=''></path>";
                this.portGroupElement.attrs = {
                    ".sl-dlg.sl-port": PortGroupComponent.portAttributes,
                };
                break;
        }
    }
    
    public getPortGroupElement(): dia.Element.PortGroup {
        return this.portGroupElement;
    }

    public getName(): string {
        return this.name;
    }

    /*public getPorts(): IterableIterator<PortComponent> {
        return this.ports.values();
    }*/

    public getGroupPosition(): PortGroupPosition {
        return this.groupPosition;
    }

    public setParent(parent: dia.Element) {        
        this.parentElement = parent;
        this.refreshPorts();

        // const that = this;
        // parent.on("change:position", function () {
        //     that.refreshMarkers();
        // });
    }

    private refreshPorts() {
        if (!this.parentElement) {
            return;
        }

        this.ports.forEach(port => {
            this.parentElement!.removePort(port.getPortElement());
        });

        this.ports.length = 0;
        [].push.apply(this.ports, createPortItems(this, this.getGroupPosition(), this.port));
        this.parentElement.addPorts(this.ports.map(port => port.getPortElement()));
    }

    // STATIC:

    /**
     * Spacing between ports. Two ports must not be closer to each other than this value.
     */
    private static readonly portSpacing = 15;

    /**
     * Width of the visible port shape.
     */
    private static readonly portWidth = 7;

    /**
     * Height of the visible port shape.
     */
    private static readonly portHeight = 21;

    /**
     * SVG attributes for the port shape.
     */
    public static readonly portAttributes: attributes.SVGAttributes = {
        paintOrder: "stroke fill",
        d:
            `M ${-PortGroupComponent.portWidth / 2} ${-PortGroupComponent.portHeight / 2} ` +
            `L ${PortGroupComponent.portWidth / 2} ${-PortGroupComponent.portHeight / 2} ` +
            `L 0 ${PortGroupComponent.portHeight / 2} z`,
        magnet: true,
        stroke: "gray",
        strokeWidth: 3
    };

    public static layoutFunction(portComponents: Array<PortComponent>, position: PortGroupPosition, offset: number, space: number): (ports: Array<any>, elBBox: g.Rect, opt: any) => Array<g.Point> {
        return function (ports: Array<PortComponent>, elBBox: g.Rect, opt: any): Array<g.Point> {
            return ports.map((port: PortComponent, index: number, ports: Array<any>) => {
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

                const lengthAbs = (count - 1) * PortGroupComponent.portSpacing;
                const spaceAbs = space * total;
                const offsetAbs = offset * total;
                const positionAbs =
                    offsetAbs +
                    index * PortGroupComponent.portSpacing +
                    (spaceAbs - lengthAbs) / 2;

                let portPosition: g.PlainPoint = {x: 0, y: 0};

                switch (position) {
                    case "top":
                        portPosition = {x: positionAbs, y: 0};
                        break;
                    case "bottom":
                        portPosition = {x: positionAbs, y: elBBox.height};
                        break;
                    case "left":
                        portPosition = {x: 0, y: positionAbs};
                        break;
                    case "right":
                        portPosition = {x: elBBox.width, y: positionAbs};
                        break;
                }

                portComponents[index].setPosition(portPosition);
                return new g.Point(portPosition);
            });
        };
    }

}