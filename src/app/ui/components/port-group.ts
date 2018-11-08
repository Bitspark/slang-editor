/**
 * A component for which there is no directly corresponding Slang model.
 * It can be thought of a component that represents a port which has no parent port but is the topmost ports.
 * Currently these are main in- and out-ports and delegate in- and out-ports.
 */
import {PortComponent} from "./port";
import {attributes, dia, g} from "jointjs";
import {PortModel} from "../../model/port";
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
                this.portGroupElement.markup = "<path class='sl-port' d=''></path>";
                break;
            case "right":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "right", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-port' d=''></path>";
                break;
            case "bottom":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "bottom", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-port' d=''></path>";
                break;
            case "left":
                this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "left", start, width) as any;
                this.portGroupElement.markup = "<path class='sl-port' d=''></path>";
                break;
        }
    }

    public getPortGroupElement(): dia.Element.PortGroup {
        return this.portGroupElement;
    }

    public getName(): string {
        return this.name;
    }

    public getGroupPosition(): PortGroupPosition {
        return this.groupPosition;
    }

    public setParent(parent: dia.Element) {
        this.parentElement = parent;
        this.refreshPorts();
    }

    private refreshPorts() {
        const parentElement = this.parentElement;
        if (!parentElement) {
            return;
        }
        
        this.ports.forEach(port => {
            parentElement.removePort(port.getPortElement());
        });
        
        this.ports.length = 0;
        this.ports.push.apply(this.ports, createPortItems(this, this.getGroupPosition(), this.port));
        parentElement.addPorts(this.ports.map(port => port.getPortElement()));
    }

    // STATIC:

    /**
     * Spacing between ports. Two ports must not be closer to each other than this value.
     */
    private static readonly portSpacing = 15;

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