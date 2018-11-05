import {attributes, dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {PortModel} from "../../model/port";
import {PortComponent, PortGroupComponent, PortGroupPosition} from "./port";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";

export class BlackBoxComponent {

    protected readonly rectangle: BlackBoxComponent.Rectangle;
    protected readonly portGroups: Array<PortGroupComponent>;
    // protected readonly portItems: Array<PortComponent> = [];

    constructor(protected graph: dia.Graph, private blackBox: BlackBox) {
        this.portGroups = this.createGroups(blackBox);
        /*this.portGroups.forEach(group => {
            this.portItems.push.apply(this.portItems, Array.from(group.getPorts()));
        });*/
        this.rectangle = new BlackBoxComponent.Rectangle(blackBox, this.portGroups);
        this.rectangle.addTo(graph);

        this.portGroups.forEach(group => {
            group.setParent(this.rectangle);
        });
    }

    public getBBox(): g.Rect {
        return this.rectangle.getBBox();
    }

    public translate(tx: number, ty: number) {
        this.rectangle.translate(tx, ty);
    }

    public getRectangle(): BlackBoxComponent.Rectangle {
        return this.rectangle;
    }

    public on(event: string, handler: Function) {
        this.rectangle.on(event, handler);
    }

    public remove(): void {
        this.rectangle.remove();
    }

    private createGroups(blackBox: BlackBox): Array<PortGroupComponent> {
        const portGroups: Array<PortGroupComponent> = [
            new PortGroupComponent(this.graph, "MainIn", blackBox.getPortIn()!, "top", 0.0, 1.0),
            new PortGroupComponent(this.graph, "MainOut", blackBox.getPortOut()!, "bottom", 0.0, 1.0),
        ];

        const delegates = Array.from(blackBox.getDelegates());

        const width = 0.5 / delegates.length;
        const step = 0.5 / delegates.length;
        let pos = 0;
        for (const delegate of delegates) {
            portGroups.push(new PortGroupComponent(this.graph, `Delegate${delegate.getName()}Out`, delegate.getPortOut()!, "right", pos, width));
            pos += step;
            portGroups.push(new PortGroupComponent(this.graph, `Delegate${delegate.getName()}In`, delegate.getPortIn()!, "right", pos, width));
            pos += step;
        }

        /*portGroups.forEach(portGroup => {
            for (const port of portGroup.getPorts()) {
                port.getModel().subscribeCollapsed(() => {
                });
            }
        });*/

        return portGroups;
    }

}

export class BlueprintBoxComponent extends BlackBoxComponent {

    constructor(graph: dia.Graph, blueprint: BlueprintModel) {
        super(graph, blueprint);

        this.getRectangle().attr({
            body: {
                cursor: "pointer",
            },
            label: {
                cursor: "pointer",
            }
        });
        this.rectangle.attr("draggable", false);
    }

}

export class OperatorBoxComponent extends BlackBoxComponent {

    constructor(graph: dia.Graph, operator: OperatorModel) {
        super(graph, operator);
    }

}

export namespace BlackBoxComponent {

    export class Rectangle extends shapes.standard.Rectangle.define("BlackBoxRectangle", {}) {

        constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>) {
            const identity = blackBox.getIdentity();

            const groupElements: { [key: string]: dia.Element.PortGroup } = {};
            portGroups.forEach(group => {
                groupElements[group.getName()] = group.getPortGroupElement();
            });
            // const portElements = portItems.map(port => port.getPortElement());

            super({
                id: identity,
                size: {width: 100, height: 100},
                attrs: {
                    root: {},
                    body: Rectangle.blueprintAttrs,
                    label: {
                        text: blackBox.getDisplayName(),
                        fill: "white",
                    },
                },
                ports: {
                    groups: groupElements,
                    // items: portElements,
                }
            } as any);

            this.set("obstacle", true);
        }

        private static blueprintAttrs: attributes.SVGAttributes = {
            fill: "blue",
            stroke: "black",
            strokeWidth: 1,
            rx: 6,
            ry: 6,
        };

    }

}

export class IsolatedBlueprintPort {

    private portGroup: PortGroupComponent;
    private readonly rectangle: shapes.standard.Rectangle;

    constructor(private graph: dia.Graph, name: string, identity: string, port: PortModel, position: PortGroupPosition) {
        const portGroup = new PortGroupComponent(graph, "PortGroup", port, position, 0, 1.0);
        const portGroups = {"PortGroup": portGroup.getPortGroupElement()};
        // const portItems = Array.from(portGroup.getPorts()).map(port => port.getPortElement());

        const translations = {
            "top": "",
            "right": "translate(-40 0)",
            "bottom": "",
            "left": "translate(40 0)",
        };

        const transform = translations[position];

        this.rectangle = new shapes.standard.Rectangle({
            id: identity,
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: {
                    fill: "none",
                    stroke: "none",
                },
                label: {
                    text: name,
                    transform: transform
                }
            },
            ports: {
                groups: portGroups,
                // items: portItems
            }
        } as any);

        this.rectangle.addTo(this.graph);

        this.portGroup = portGroup;
        portGroup.setParent(this.rectangle);
    }

    public getElement(): dia.Element {
        return this.rectangle;
    }

}