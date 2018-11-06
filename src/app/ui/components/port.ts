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

    // private mapMarkers = new Map<PortModel, [g.Point, g.Point, PortGroupPosition]>();
    // private mapRectangles = new Map<[g.Point, g.Point, PortGroupPosition], shapes.standard.Rectangle>();
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
        
        // this.addMapMarkers();
        // this.createMarkerRectangles();
    }
    
    /*private createMarkerRectangles(): void {
        this.mapRectangles.forEach(rectangle => rectangle.remove());
        this.mapRectangles.clear();
        
        const parentPosition = this.parentElement!.position();
        this.mapMarkers.forEach((marker, port) => {
            const rect = PortGroupComponent.getMarkerRect(marker[0], marker[1], marker[2]);
            if (!rect) {
                return;
            }
            const mapRect = new shapes.standard.Rectangle({
                position: {
                    x: parentPosition.x + rect.x,
                    y: parentPosition.y + rect.y,
                },
                size: {
                    width: rect.width,
                    height: rect.height,
                },
                attrs: {
                    body: {
                        fill: "none",
                        stroke: "green",
                        "stroke-width": 5,
                        rx: 5,
                        ry: 5,
                    },
                }
            });
            mapRect.attr("draggable", false);
            mapRect.attr("body/cursor", "default");
            this.mapRectangles.set(marker, mapRect);
            mapRect.addTo(this.graph);

            mapRect.on("mouseover", function () {
                mapRect.toFront();
                mapRect.attr("body/stroke", "yellow");
            });

            mapRect.on("mouseout", function () {
                if (port.isCollapsed()) {
                    mapRect.attr("body/stroke", "purple");
                } else {
                    mapRect.attr("body/stroke", "green");
                }
            });

            const that = this;
            (function (port: PortModel) {
                mapRect.on("pointerdown", function () {
                    if (port.isCollapsed()) {
                        port.expand();
                    } else {
                        port.collapse();
                    }
                    
                    that.refreshPorts();
                });
            })(port);

            port.subscribeCollapsed(collapsed => {
                if (collapsed) {
                    mapRect.attr("body/stroke", "purple");
                } else {
                    mapRect.attr("body/stroke", "green");
                }
            });
        });
    }

    private refreshMarkers(): void {
        const parentPosition = this.parentElement!.position();
        this.mapRectangles.forEach((rect, marker) => {
            const newRect = PortGroupComponent.getMarkerRect(marker[0], marker[1], marker[2]);
            if (!newRect) {
                return;
            }
            rect.set({
                position: {
                    x: parentPosition.x + newRect.x,
                    y: parentPosition.y + newRect.y,
                }
            });
        });
    }

    private addMapMarkers(): void {
        this.mapMarkers.clear();
        this.ports.map(port => this.addMapMarkersBottomUp(port.getModel() as OperatorPortModel, port));
    }

    private addMapMarkersBottomUp(port: PortModel, component: PortComponent): void {
        const portPos = component.getPosition();
        if (!portPos) {
            throw new Error(`port ${port.getIdentity()} has no position`);
        }

        const rect = this.mapMarkers.get(port);
        if (rect) {
            if (portPos.x < rect[0].x) {
                rect[0].x = portPos.x;
            } else if (portPos.x > rect[1].x) {
                rect[1].x = portPos.x;
            }

            if (portPos.y < rect[0].y) {
                rect[0].y = portPos.y;
            } else if (portPos.y > rect[1].y) {
                rect[1].y = portPos.y;
            }
        } else {
            if (port.getType().getTypeIdentifier() === TypeIdentifier.Map) {
                this.mapMarkers.set(port, [new g.Point(portPos), new g.Point(portPos), component.getGroup().getGroupPosition()]);
            }

            const parentPort = port.getParentNode().getAncestorNode<PortModel>(BlueprintPortModel, OperatorPortModel);
            if (parentPort) {
                this.addMapMarkersBottomUp(parentPort, component);
            }
        }
    }*/

    // STATIC:

    /*private static getMarkerRect(topLeft: g.PlainPoint, bottomRight: g.PlainPoint, groupPosition: PortGroupPosition): g.PlainRect | null {
        // if (topLeft.x == bottomRight.x && topLeft.y == bottomRight.y) {
        //     return null;
        // }

        const rect = {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
        };

        switch (groupPosition) {
            case "top":
            case "bottom":
                rect.y -= 15;
                rect.height = 30;

                rect.x -= 10;
                rect.width += 20;
                break;
            case "left":
            case "right":
                rect.x -= 15;
                rect.width = 30;

                rect.y -= 10;
                rect.height += 20;
                break;
        }

        return rect;
    }*/

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