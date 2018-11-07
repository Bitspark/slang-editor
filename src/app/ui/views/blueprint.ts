import {dia, g, layout, shapes, linkTools} from "jointjs";
import {BlackBoxComponent, IsolatedBlueprintPort, OperatorBoxComponent} from "../components/blackbox";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {Connection} from "../../custom/connections";
import {BlackBox, PortOwner, SlangNode} from '../../custom/nodes';
import {HTMLCanvas} from "../cavas";
import {PaperView} from "./paper-view";
import {BlueprintPortModel, GenericPortModel, PortModel} from "../../model/port";
import {slangRouter} from "../utils/router";
import {slangConnector} from "../utils/connector";

const GhostConnectionLink = dia.Link.define("Connection", {
    router: slangRouter,
    connector: slangConnector,
}, {
    toolMarkup: [
        "<g class='link-tool'>",
        "</g>",].join(""),
});

const ConnectionLink = dia.Link.define("Connection", {
    router: slangRouter,
    connector: slangConnector,
}, {
    toolMarkup: [
        "<g class='link-tool'>",
        "<g class='tool-remove' event='tool:remove'>",
        "<circle r='11' fill='red' />",
        "<path transform='scale(.8) translate(-16, -16)' d='M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z' fill='white' />",
        "<title>Unconnect</title>",
        "</g>",
        "</g>",].join(""),
});

export class BlueprintView extends PaperView {

    private outer: dia.Element;
    private topPorts: Array<dia.Element> = [];
    private bottomPorts: Array<dia.Element> = [];
    private rightPorts: Array<dia.Element> = [];
    private leftPorts: Array<dia.Element> = [];
    private operators: Array<BlackBoxComponent> = [];
    private outerPadding = 120;
    private linkTools: dia.ToolsView;

    constructor(canvas: HTMLCanvas, private blueprint: BlueprintModel) {
        super(canvas);

        this.subscribe();

        this.createIsolatedPorts();
        this.createOperators();
        this.createConnections();
        this.autoLayout();

        this.outer = this.createOuter();
        this.fitOuter();

        this.attachEventHandlers();

        this.addOriginPoint();


        const removeTool = new linkTools.Remove();
        this.linkTools = new dia.ToolsView({
            tools: []
        });
    }

    protected createPaper(): dia.Paper {
        const that = this;
        const paper = super.createPaper({
            allowLink: function (linkView: dia.LinkView): boolean {
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

                const sourcePort = that.blueprint.find(sourcePortRef);
                const destinationPort = that.blueprint.find(destinationPortRef);
                if (!sourcePort || !destinationPort ||
                    !(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
                    return false;
                }

                if (sourcePort.canConnect(destinationPort)) {
                    try {
                        sourcePort.connect(destinationPort);
                    } catch (e) {
                        console.error(e);
                    }
                }

                return false;
            },
            defaultLink: function (cellView: dia.CellView): dia.Link {
                return new GhostConnectionLink({
                    attrs: {
                        ".connection": {
                            stroke: "#aaaaaa",
                            "stroke-width": 3,
                        }
                    }
                } as any);
            },
            validateConnection: function (cellViewS: dia.CellView,
                                          magnetS: SVGElement,
                                          cellViewT: dia.CellView,
                                          magnetT: SVGElement,
                                          end: "source" | "target",
                                          linkView: dia.LinkView): boolean {
                if (!magnetS || !magnetT) {
                    return false;
                }

                const sourcePortRef = magnetS.getAttribute("port");
                const destinationPortRef = magnetT.getAttribute("port");
                if (!sourcePortRef || !destinationPortRef) {
                    return false;
                }

                const sourcePort = that.blueprint.find(sourcePortRef);
                const destinationPort = that.blueprint.find(destinationPortRef);
                if (!sourcePort || !destinationPort ||
                    !(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
                    return false;
                }

                return sourcePort.canConnect(destinationPort);
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

            const sourcePort = that.blueprint.find(sourcePortRef);
            const destinationPort = that.blueprint.find(destinationPortRef);
            if (!sourcePort || !destinationPort ||
                !(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
                return false;
            }

            sourcePort.unconnect(destinationPort);
        });
        return paper;
    }

    private attachEventHandlers() {
        const that = this;
        this.graph.on("change:position change:size", function (cell: dia.Cell) {
            if (!(cell instanceof BlackBoxComponent.Rectangle)) {
                return;
            }

            that.fitOuter();
        });
    }

    private subscribe() {
        const that = this;
        this.blueprint.subscribeOperatorAdded(function (op: OperatorModel) {
            that.addOperator(op);
        });

        // Ports
        const ports = Array.from(this.blueprint.getDescendentNodes<BlueprintPortModel>(BlueprintPortModel));
        ports.filter(port => port.isSource()).forEach(source => {
            source.subscribeConnected(connection => {
                this.addConnection(connection);
            });
            source.subscribeUnconnected(connection => {
                this.removeConnection(connection);
            });
        });
    }

    private createOuter(): dia.Element {
        const size = {width: this.outerPadding * 2 + 10, height: this.outerPadding * 2 + 10};
        const position = {x: -size.width / 2, y: -size.height / 2};

        const outer = new (shapes.standard.Rectangle.define("BlueprintOuter", {
            position: position
        }))({id: `${this.blueprint.getIdentity()}_outer}`});
        outer.attr("body/fill", "blue");
        outer.attr("body/fill-opacity", ".05");
        outer.attr("body/rx", "24");
        outer.attr("body/ry", "24");
        outer.attr("body/cursor", "default");
        outer.set("obstacle", false);
        outer.set("size", size);
        outer.attr("draggable", false);
        outer.position(position);
        outer.addTo(this.graph);
        outer.toBack();

        return outer;
    }

    private createIsolatedPorts(): void {
        const that = this;

        // In
        const portInComponent = new IsolatedBlueprintPort(this.graph, `${this.blueprint.getShortName()} In-Port`, `${this.blueprint.getIdentity()}_in`, this.blueprint.getPortIn()!, "bottom");
        const portInElement = portInComponent.getElement();
        this.topPorts.push(portInElement);
        portInElement.set({position: {x: -50, y: 0}});
        portInElement.set("restrictTranslate", function (): g.PlainRect {
            const outerPosition = that.outer.get("position") as g.PlainPoint;
            const outerSize = that.outer.get("size") as g.PlainRect;
            const elementSize = portInElement.get("size") as g.PlainRect;
            return {
                x: outerPosition.x,
                y: outerPosition.y - elementSize.height,
                width: outerSize.width,
                height: elementSize.height
            };
        });

        // Out
        const portOutComponent = new IsolatedBlueprintPort(this.graph, `${this.blueprint.getShortName()} Out-Port`, `${this.blueprint.getIdentity()}_out`, this.blueprint.getPortOut()!, "top");
        const portOutElement = portOutComponent.getElement();
        this.bottomPorts.push(portOutElement);
        portOutElement.set({position: {x: -50, y: 0}});
        portOutElement.set("restrictTranslate", function (): g.PlainRect {
            const outerPosition = that.outer.get("position") as g.PlainPoint;
            const outerSize = that.outer.get("size") as g.PlainRect;
            const elementSize = portOutElement.get("size") as g.PlainRect;
            return {
                x: outerPosition.x,
                y: outerPosition.y + outerSize.height,
                width: outerSize.width,
                height: elementSize.height
            };
        });

        // Delegates
        for (const delegate of this.blueprint.getDelegates()) {
            const portOutComponent = new IsolatedBlueprintPort(this.graph, `Delegate ${delegate.getName()}`, `${delegate.getIdentity()}_out`, delegate.getPortOut()!, "left");
            const portOutElement = portOutComponent.getElement();
            this.rightPorts.push(portOutElement);
            portOutElement.set({position: {x: 0, y: -50}});
            portOutElement.set("restrictTranslate", function (): g.PlainRect {
                const outerPosition = that.outer.get("position") as g.PlainPoint;
                const outerSize = that.outer.get("size") as g.PlainRect;
                const elementSize = portOutElement.get("size") as g.PlainRect;
                return {
                    x: outerPosition.x + outerSize.width,
                    y: outerPosition.y,
                    width: elementSize.width,
                    height: outerSize.height
                };
            });

            const portInComponent = new IsolatedBlueprintPort(this.graph, `Delegate ${delegate.getName()}`, `${delegate.getIdentity()}_in`, delegate.getPortIn()!, "left");
            const portInElement = portInComponent.getElement();
            this.rightPorts.push(portInElement);
            portInElement.set({position: {x: 0, y: -50}});
            portInElement.set("restrictTranslate", function (): g.PlainRect {
                const outerPosition = that.outer.get("position") as g.PlainPoint;
                const outerSize = that.outer.get("size") as g.PlainRect;
                const elementSize = portInElement.get("size") as g.PlainRect;
                return {
                    x: outerPosition.x + outerSize.width,
                    y: outerPosition.y,
                    width: elementSize.width,
                    height: outerSize.height
                };
            });
        }
    }

    private createOperators() {
        for (const op of this.blueprint.getOperators()) {
            this.addOperator(op);
        }
    }

    private createConnections() {
        for (const connection of this.blueprint.getConnections().getConnections()) {
            this.addConnection(connection);
        }
    }

    private addConnection(connection: Connection) {
        const sourceOwner = connection.source.getAncestorNode<BlackBox>(BlackBox);
        const destinationOwner = connection.destination.getAncestorNode<BlackBox>(BlackBox);

        if (!sourceOwner) {
            throw new Error(`no source owner found`);
        }
        if (!destinationOwner) {
            throw new Error(`no destination owner found`);
        }

        let sourceIdentity = sourceOwner.getIdentity();
        if (sourceOwner instanceof BlueprintModel) {
            sourceIdentity = connection.source.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_in";
        }

        let destinationIdentity = destinationOwner.getIdentity();
        if (destinationOwner instanceof BlueprintModel) {
            destinationIdentity = connection.destination.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_out";
        }

        const linkId = `${sourceIdentity}>${destinationIdentity}`;
        const link = new ConnectionLink({
            id: linkId,
            source: {
                id: sourceIdentity,
                port: connection.source.getIdentity(),
            },
            target: {
                id: destinationIdentity,
                port: connection.destination.getIdentity(),
            },
            attrs: {
                ".connection": {
                    stroke: "#777777",
                    "stroke-width": 3,
                }
            },
            toolMarkup: false,
        } as any);
        link.addTo(this.graph);
    }

    private removeConnection(connection: Connection) {
        const sourceOwner = connection.source.getAncestorNode<BlackBox>(BlackBox);
        const destinationOwner = connection.destination.getAncestorNode<BlackBox>(BlackBox);

        if (!sourceOwner) {
            throw new Error(`no source owner found`);
        }
        if (!destinationOwner) {
            throw new Error(`no destination owner found`);
        }

        let sourceIdentity = sourceOwner.getIdentity();
        if (sourceOwner instanceof BlueprintModel) {
            sourceIdentity = connection.source.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_in";
        }

        let destinationIdentity = destinationOwner.getIdentity();
        if (destinationOwner instanceof BlueprintModel) {
            destinationIdentity = connection.destination.getAncestorNode<PortOwner>(PortOwner)!.getIdentity() + "_out";
        }
        
        const linkId = `${sourceIdentity}>${destinationIdentity}`;
        const link = this.graph.getCell(linkId);
        
        if (link) {
            link.remove();
        } else {
            throw `link could not be found`;
        }
    }
    
    private autoLayout() {
        layout.DirectedGraph.layout(this.graph, {
            nodeSep: 120,
            rankSep: 120,
            edgeSep: 360,
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
        const ports = Array.from(operator.getDescendentNodes<PortModel>(GenericPortModel));
        const sourcePorts = ports.filter(port => port.isSource());
        sourcePorts.forEach(source => {
            source.subscribeConnected(connection => {
                this.addConnection(connection);
            });
            source.subscribeUnconnected(connection => {
                this.removeConnection(connection);
            })
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

}