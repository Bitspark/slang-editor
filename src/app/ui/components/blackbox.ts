import {dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PortGroupComponent} from "./port-group";
import {Styles} from "../../../styles/studio";

export class BlackBoxComponent {

    protected rectangle: BlackBoxComponent.Rect;
    protected portGroups: Array<PortGroupComponent>;

    constructor(protected graph: dia.Graph, protected readonly blackBox: BlackBox) {
        this.portGroups = this.createGroups(this.blackBox);
        this.rectangle = new BlackBoxComponent.Rect(blackBox, this.portGroups);
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

    public getRectangle(): BlackBoxComponent.Rect {
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
            const portOut = delegate.getPortOut();
            if (portOut) {
                portGroups.push(new PortGroupComponent(this.graph, `Delegate${delegate.getName()}Out`, portOut, "right", pos, width));
            }
            pos += step;

            const portIn = delegate.getPortIn();
            if (portIn) {
                portGroups.push(new PortGroupComponent(this.graph, `Delegate${delegate.getName()}In`, portIn, "right", pos, width));
            }
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
    import RectangleSelectors = shapes.standard.RectangleSelectors;

    interface BasicAttrs {
        id?: string
        label: string
        draggable: boolean
        obstacle: boolean
        cssClass?: string
        portGroups?: Array<PortGroupComponent>
    }

    function constructRectAttrs(attrs: BasicAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
        return {
            id: attrs.id,
            size: Styles.BlackBox.size,
            attrs: {
                root: {
                    class: "joint-cell joint-element sl-blackbox ${cssClass}",
                },
                body: {
                    rx: Styles.BlackBox.rx,
                    ry: Styles.BlackBox.ry,
                    class: "sl-rectangle",
                    filter: Styles.BlackBox.filter,
                },
                label: {
                    text: attrs.label,
                    class: "sl-label",
                },
            },
            ports: !attrs.portGroups ? undefined : {
                groups: attrs.portGroups!
                    .reduce((result: { [key: string]: dia.Element.PortGroup }, group) => {
                        result[group.getName()] = group.getPortGroupElement();
                        return result;
                    }, {})
            },
        }
    }

    export class Rect extends shapes.standard.Rectangle.define("BlackBoxRect", {}) {
        constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>) {
            super(constructRectAttrs({
                id: blackBox.getIdentity(),
                label: blackBox.getDisplayName(),
                draggable: true, obstacle: true,
                portGroups
            }) as any);
        }
    }

    export namespace Rect {
        export class Ghost extends shapes.standard.Rectangle.define("BlackBoxGhost", {}) {
            constructor(label: string) {
                super(constructRectAttrs({
                    label,
                    draggable: false,
                    obstacle: true,
                }) as any);
            }
        }
    }


}
