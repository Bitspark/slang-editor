import {dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PortGroupComponent} from "./port-group";
import {Styles} from "../../../styles/studio";

export class BlackBoxComponent {

    protected readonly rectangle: BlackBoxComponent.Rectangle;
    protected readonly portGroups: Array<PortGroupComponent>;

    constructor(protected graph: dia.Graph, private blackBox: BlackBox) {
        this.portGroups = this.createGroups(blackBox);
        this.rectangle = new BlackBoxComponent.Rectangle(blackBox, this.portGroups);
        this.rectangle.addTo(graph);

        this.portGroups.forEach(group => {
            group.setParent(this.rectangle);
        });
    }
    
    public refresh() {
        // this.portGroups = this.createGroups(blackBox);
        // this.rectangle = new BlackBoxComponent.Rectangle(blackBox, this.portGroups);
        // this.rectangle.
        // this.rectangle.addTo(graph);

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
        const portGroups: Array<PortGroupComponent> = [];
        
        const portIn = blackBox.getPortIn();
        if (portIn) {
            portGroups.push(new PortGroupComponent(this.graph, "MainIn", portIn, "top", 0.0, 1.0));
        }
        
        const portOut = blackBox.getPortOut();
        if (portOut) {
            portGroups.push(new PortGroupComponent(this.graph, "MainOut", portOut, "bottom", 0.0, 1.0));
        }

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
        if (operator.position) {
            this.getRectangle().position(operator.position.x, operator.position.y);
        }
    }

}

export namespace BlackBoxComponent {
    export class GhostRectangle extends shapes.standard.Rectangle.define("BlackBoxGhostRectangle", {}) {

        constructor() {
            super({
                size: Styles.BlackBox.size,
                attrs: {
                    root: {
                        class: "joint-cell joint-element sl-blackbox-ghost",
                    },
                    body: {
                        rx: Styles.BlackBox.rx,
                        ry: Styles.BlackBox.ry,
                        class: "sl-rectangle",
                        filter: Styles.BlackBox.filter,
                    },
                    label: {
                        text: "• • •",
                        class: "sl-label",
                    },
                },
            } as any);

            this.attr("draggable", false);
            this.set("obstacle", false);
        }

    }

    export class Rectangle extends shapes.standard.Rectangle.define("BlackBoxRectangle", {}) {

        constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>) {
            const identity = blackBox.getIdentity();

            const groupElements: { [key: string]: dia.Element.PortGroup } = {};
            portGroups.forEach(group => {
                groupElements[group.getName()] = group.getPortGroupElement();
            });

            super({
                id: identity,
                size: Styles.BlackBox.size,
                attrs: {
                    root: {
                        class: "joint-cell joint-element sl-blackbox",
                    },
                    body: {
                        rx: Styles.BlackBox.rx,
                        ry: Styles.BlackBox.ry,
                        class: "sl-rectangle",
                        filter: Styles.BlackBox.filter,
                    },
                    label: {
                        text: blackBox.getDisplayName(),
                        class: "sl-label",
                    },
                },
                ports: {
                    groups: groupElements,
                },
            } as any);

            this.set("obstacle", true);
        }

    }

}
