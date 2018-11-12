import {dia, g, layout, shapes} from "jointjs";
import {BlackBoxComponent, OperatorBoxComponent} from "../components/blackbox";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {Connection} from "../../custom/connections";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";
import {BlueprintPortModel, GenericPortModel, PortModel} from "../../model/port";
import {IsolatedBlueprintPort} from "../components/blueprint-port";
import {PortGroupPosition} from "../components/port-group";
import {BlueprintSelectComponent} from "../components/blueprint-select";
import {ConnectionComponent} from "../components/connection";
import {Styles} from "../../../styles/studio";
import ElementView = dia.ElementView;
import {SlangNode} from '../../custom/nodes';

export class BlueprintView extends PaperView {

    private outer: dia.Element;
    private topPorts: Array<dia.Element> = [];
    private bottomPorts: Array<dia.Element> = [];
    private rightPorts: Array<dia.Element> = [];
    private leftPorts: Array<dia.Element> = [];
    private operators: Array<BlackBoxComponent> = [];
    private connections: Array<ConnectionComponent> = [];
    private outerPadding = 120;

    private blueprintSelect: BlueprintSelectComponent | null;

    constructor(frame: ViewFrame, private blueprint: BlueprintModel) {
        super(frame);
        this.addZooming();
        this.addPanning();

        this.subscribe();

        this.createIsolatedPorts();
        this.createOperators();
        this.createConnections();
        this.autoLayout();

        this.outer = this.createOuter();
        this.fitOuter();

        this.attachEventHandlers();

        // this.addOriginPoint();

        this.fit();
    }

    protected createPaper(): dia.Paper {
        const that = this;
        const paper = super.createPaper({
            allowLink: function (linkView: dia.LinkView): boolean {
                const magnetS = linkView.getEndMagnet("source");
                if (!magnetS) {
                    return false;
                }
                const magnetT = linkView.getEndMagnet("target");
                if (!magnetT) {
                    return false;
                }

                const portS = that.getPortFromMagnet(magnetS);
                if (!portS) {
                    return false;
                }
                const portT = that.getPortFromMagnet(magnetT);
                if (!portT) {
                    return false;
                }

                if (portS.canConnect(portT)) {
                    try {
                        portS.connect(portT);
                    } catch (e) {
                        console.error(e);
                    }
                }

                return false;
            },
            defaultLink: function (cellView: dia.CellView, magnet: SVGElement): dia.Link {
                const port = that.getPortFromMagnet(magnet);
                if (port) {
                    const link = ConnectionComponent.createGhostLink(port.getTypeIdentifier());
                    link.on("remove", function () {
                        link.transition("attrs/.connection/stroke-opacity", 0.0);
                    });
                    return link;
                } else {
                    throw new Error(`could not find source port`);
                }
            },
            validateConnection: function (cellViewS: dia.CellView,
                                          magnetS: SVGElement,
                                          cellViewT: dia.CellView,
                                          magnetT: SVGElement,
                                          end: "source" | "target",
                                          linkView: dia.LinkView): boolean {
                const portS = that.getPortFromMagnet(magnetS);
                if (!portS) {
                    return false;
                }
                const portT = that.getPortFromMagnet(magnetT);
                if (!portT) {
                    return false;
                }

                return portS.canConnect(portT);
            },
            snapLinks: {radius: 75,},
            markAvailable: true,
        });
        paper.on("tool:remove", function (linkView: dia.LinkView) {
            const magnetS = linkView.getEndMagnet("source");
            const magnetT = linkView.getEndMagnet("target");
            if (!magnetS || !magnetT) {
                return false;
            }

            const sourcePortRef = magnetS.getAttribute("port");
            const destinationPortRef = magnetT.getAttribute("port");
            if (!sourcePortRef || !destinationPortRef) {
                return false;
            }

            const sourcePort = that.blueprint.findNodeById(sourcePortRef);
            const destinationPort = that.blueprint.findNodeById(destinationPortRef);
            if (!sourcePort || !destinationPort ||
                !(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
                return false;
            }

            sourcePort.disconnect(destinationPort);
        });
        return paper;
    }

    private attachEventHandlers() {
        const that = this;
        this.graph.on("change:position change:size", function (cell: dia.Cell) {
            // Moving around inner operators
            if (!(cell instanceof BlackBoxComponent.Rectangle)) {
                return;
            }
            that.fitOuter();
        });

        this.outer.on("pointerdblclick", function (elementView: ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
            that.blueprintSelect = new BlueprintSelectComponent(that, [x, y], [evt.clientX, evt.clientY]);

        });
        this.getPaper().on("blank:pointerclick cell:pointerclick", function (elementView: ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
            if (that.blueprintSelect) {
                that.blueprintSelect.destroy();
                that.blueprintSelect = null;
            }
        });
    }

    private subscribe() {
        const that = this;
        this.blueprint.subscribeChildCreated(OperatorModel, function (op: OperatorModel) {
            that.addOperator(op);
        });

        // Ports
        const ports = Array.from(this.blueprint.getDescendantNodes(BlueprintPortModel));
        ports.filter(port => port.isSource()).forEach(source => {
            source.subscribeConnected(connection => {
                this.addConnection(connection);
            });
            source.subscribeDisconnected(connection => {
                this.removeConnection(connection);
            });
        });
    }

    private createOuter(): dia.Element {
        const size = {width: this.outerPadding * 2 + 10, height: this.outerPadding * 2 + 10};
        const position = {x: -size.width / 2, y: -size.height / 2};

        const outer = new (shapes.standard.Rectangle.define("BlueprintOuter", {
            position: position,
            attrs: {
                root: {
                    class: "joint-cell joint-element sl-outer",
                },
                body: {
                    rx: Styles.Outer.rx,
                    ry: Styles.Outer.ry,
                    class: "sl-rectangle",
                    cursor: "default",
                    filter: Styles.Outer.filter,
                },
            },
        }))({id: `${this.blueprint.getIdentity()}_outer}`});
        outer.set("obstacle", false);
        outer.set("size", size);
        outer.attr("draggable", false);
        outer.position(position);
        outer.addTo(this.graph);
        outer.toBack();

        return outer;
    }

    private createIsolatedPort(port: BlueprintPortModel, id: string, name: string, position: PortGroupPosition): void {
        const invertedPosition: { [key in PortGroupPosition]: PortGroupPosition } = {
            top: "bottom",
            bottom: "top",
            left: "right",
            right: "left",
        };

        const that = this;
        const portComponent = new IsolatedBlueprintPort(this.graph, name, id, port, invertedPosition[position]);
        const portElement = portComponent.getElement();

        let calculateRestrictedRect: (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => g.PlainRect;

        const elementSize = portElement.get("size") as g.PlainRect;

        switch (position) {
            case "top":
                portElement.set({position: {x: -elementSize.width / 2, y: 0}});
                this.topPorts.push(portElement);
                calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
                    x: outerPosition.x,
                    y: outerPosition.y - elementSize.height,
                    width: outerSize.width,
                    height: elementSize.height
                });
                break;
            case "bottom":
                portElement.set({position: {x: -elementSize.width / 2, y: 0}});
                this.bottomPorts.push(portElement);
                calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
                    x: outerPosition.x,
                    y: outerPosition.y + outerSize.height,
                    width: outerSize.width,
                    height: elementSize.height
                });
                break;
            case "left":
                portElement.set({position: {x: 0, y: -elementSize.height / 2}});
                this.leftPorts.push(portElement);
                calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
                    x: outerPosition.x - elementSize.width,
                    y: outerPosition.y,
                    width: elementSize.width,
                    height: outerSize.height
                });
                break;
            case "right":
                portElement.set({position: {x: 0, y: -elementSize.height / 2}});
                this.rightPorts.push(portElement);
                calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
                    x: outerPosition.x + outerSize.width,
                    y: outerPosition.y,
                    width: elementSize.width,
                    height: outerSize.height
                });
                break;
        }

        portElement.set("restrictTranslate", function (): g.PlainRect {
            const outerPosition = that.outer.get("position") as g.PlainPoint;
            const outerSize = that.outer.get("size") as g.PlainRect;
            return calculateRestrictedRect(outerPosition, outerSize);
        });
    }

    private createIsolatedPorts(): void {
        this.createIsolatedPort(this.blueprint.getPortIn()!, `${this.blueprint.getIdentity()}_in`, `${this.blueprint.getShortName()} In-Port`, "top");
        this.createIsolatedPort(this.blueprint.getPortOut()!, `${this.blueprint.getIdentity()}_out`, `${this.blueprint.getShortName()} Out-Port`, "bottom");

        for (const delegate of this.blueprint.getDelegates()) {
            this.createIsolatedPort(delegate.getPortOut()!, `${delegate.getIdentity()}_out`, `Delegate ${delegate.getName()} Out-Port`, "right");
            this.createIsolatedPort(delegate.getPortIn()!, `${delegate.getIdentity()}_in`, `Delegate ${delegate.getName()} In-Port`, "right");
        }
    }

    private createOperators() {
        for (const op of this.blueprint.getOperators()) {
            this.addOperator(op);
        }
    }

    private createConnections() {
        for (const connection of this.blueprint.getConnectionsTo().getIterator()) {
            this.addConnection(connection);
        }
    }

    private addConnection(connection: Connection) {
        const connectionComponent = new ConnectionComponent(this.graph, connection);
        this.connections.push(connectionComponent);
    }

    private removeConnection(connection: Connection) {
        const linkId = ConnectionComponent.getLinkId(connection);
        const link = ConnectionComponent.findLink(this.graph, connection);
        if (link) {
            link.remove();
        } else {
            throw new Error(`link with id ${linkId} not found`);
        }
        const idx = this.connections.findIndex(conn => conn.getId() === linkId);
        if (idx !== -1) {
            this.connections.splice(idx, 1);
        } else {
            throw new Error(`connection with id ${linkId} not found`);
        }
    }

    private autoLayout() {
        layout.DirectedGraph.layout(this.graph, {
            nodeSep: 120,
            rankSep: 120,
            edgeSep: 0,
            rankDir: "TB",
            resizeClusters: false,
        });

        let boundingBox = this.graph.getCellsBBox(this.operators.map(operator => operator.getRectangle()))!;

        this.operators.forEach(operator => {
            operator.translate(-(boundingBox.x + boundingBox.width / 2), -(boundingBox.y + boundingBox.height / 2));
        });

        boundingBox.x -= boundingBox.x + boundingBox.width / 2;
        boundingBox.y -= boundingBox.y + boundingBox.height / 2;

        // Center ports

        const padding = this.outerPadding;

        for (const port of this.topPorts) {
            port.set({
                position: {
                    x: boundingBox.x - 50 + boundingBox.width / 2,
                    y: boundingBox.y - 100 - padding,
                }
            });
        }

        for (const port of this.bottomPorts) {
            port.set({
                position: {
                    x: boundingBox.x - 50 + boundingBox.width / 2,
                    y: boundingBox.y + boundingBox.height + padding,
                }
            });
        }

        const offset = boundingBox.y + (boundingBox.height - this.rightPorts.length * 100) / 2;
        this.rightPorts.forEach((port, index) => {
            port.set({
                position: {
                    x: boundingBox.x + boundingBox.width + padding,
                    y: offset + index * 100,
                }
            });
        });
    }

    private addOperator(operator: OperatorModel) {
        const operatorElement = new OperatorBoxComponent(this.graph, operator);
        this.operators.push(operatorElement);

        operator.subscribeChildCreated(SlangNode, () => {
            operatorElement.refresh();
        });

        // JointJS -> Model
        operatorElement.on("pointerclick", function (evt: Event, x: number, y: number) {
            operator.select();
        });

        // Model -> JointJS
        operator.subscribeDeleted(function () {
            operatorElement.remove();
        });
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                operatorElement.getRectangle().attr("body/fill", "orange");
            } else {
                operatorElement.getRectangle().attr("body/fill", "blue");
            }
        });

        // Ports
        const ports = Array.from(operator.getDescendantNodes(GenericPortModel));
        const sourcePorts = ports.filter(port => port.isSource());
        sourcePorts.forEach(source => {
            source.subscribeConnected(connection => {
                this.addConnection(connection);
            });
            source.subscribeDisconnected(connection => {
                this.removeConnection(connection);
            });
        });
    }

    private fitOuter() {
        const padding = this.outerPadding;
        const currentPosition = this.outer.get("position");
        const currentSize = this.outer.get("size");

        let newX: number = currentPosition.x + padding;
        let newY: number = currentPosition.y + padding;
        let newCornerX: number = currentPosition.x + currentSize.width - 2 * padding;
        let newCornerY: number = currentPosition.y + currentSize.height - 2 * padding;

        this.operators.forEach((operator: BlackBoxComponent) => {
            const childBbox = operator.getBBox();
            if (childBbox.x < newX) {
                newX = childBbox.x;
            }
            if (childBbox.y < newY) {
                newY = childBbox.y;
            }
            if (childBbox.corner().x > newCornerX) {
                newCornerX = childBbox.corner().x;
            }
            if (childBbox.corner().y > newCornerY) {
                newCornerY = childBbox.corner().y;
            }
        });

        const set = {
            position: {x: 0, y: 0},
            size: {width: 0, height: 0}
        };

        set.position.x = newX - padding;
        set.position.y = newY - padding;
        set.size.width = newCornerX - newX + 2 * padding;
        set.size.height = newCornerY - newY + 2 * padding;

        let newPosition = {x: currentPosition.x, y: currentPosition.y};
        let newSize = {width: currentPosition.width, height: currentPosition.height};

        if (currentPosition.x <= set.position.x && currentPosition.y <= set.position.y) {
            delete set.position;
        } else {
            if (currentPosition.x <= set.position.x) {
                set.position.x = currentPosition.x;
            } else if (currentPosition.y <= set.position.y) {
                set.position.y = currentPosition.y;
            }
            const deltaX = currentPosition.x - set.position.x;
            const deltaY = currentPosition.y - set.position.y;
            set.size.width = Math.max(set.size.width, currentSize.width + deltaX);
            set.size.height = Math.max(set.size.height, currentSize.height + deltaY);
            newPosition = set.position;
            newSize = set.size;
        }

        if (set.size.width <= currentSize.width && set.size.height <= currentSize.height) {
            delete set.size;
        } else {
            if (set.size.width <= currentSize.width) {
                set.size.width = currentSize.width;
            } else if (set.size.height <= currentSize.height) {
                set.size.height = currentSize.height;
            }
            newSize = set.size;
        }

        if (!!set.position || !!set.size) {
            this.outer.set(set);

            for (const port of this.topPorts) {
                const currentPortPosition = port.get("position");
                port.set({
                    position: {
                        x: currentPortPosition.x,
                        y: newPosition.y - 100,
                    }
                });
            }

            for (const port of this.bottomPorts) {
                const currentPortPosition = port.get("position");
                port.set({
                    position: {
                        x: currentPortPosition.x,
                        y: newPosition.y + newSize.height,
                    }
                });
            }

            this.rightPorts.forEach(port => {
                const currentPortPosition = port.get("position");
                port.set({
                    position: {
                        x: newPosition.x + newSize.width,
                        y: currentPortPosition.y,
                    }
                });
            });
        }
    }

    private addOriginPoint() {
        const origin = new shapes.standard.Circle({
            size: {
                width: 4,
                height: 4,
            },
            position: {
                x: -2,
                y: -2,
            }
        }).addTo(this.graph);

        origin.attr("body/fill", "blue");
        origin.attr("body/fill-opacity", ".05");
        origin.attr("body/rx", "24");
        origin.attr("body/ry", "24");
        origin.attr("draggable", false);
        origin.set("obstacle", false);
    }

    private getPortFromMagnet(magnet: SVGElement): PortModel | undefined {
        if (!magnet) {
            return undefined;
        }
        const portId = magnet.getAttribute("port");
        if (!portId) {
            return undefined;
        }
        const port = this.blueprint.findNodeById(portId);
        if (!port || !(port instanceof GenericPortModel)) {
            return undefined;
        }
        return port;
    }

    public getBlueprint(): BlueprintModel {
        return this.blueprint;
    }

}