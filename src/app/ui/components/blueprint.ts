import {dia, g, layout, shapes} from "jointjs";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {BlackBox, PortOwner} from "../../custom/nodes";
import {BlackBoxComponent, IsolatedBlueprintPort, OperatorBoxComponent} from "./blackbox";
import {slangRouter} from "../utils/router";
import {slangConnector} from "../utils/connector";

export class BlueprintComponent {
    private outer: dia.Element;
    private topPorts: Array<dia.Element> = [];
    private bottomPorts: Array<dia.Element> = [];
    private rightPorts: Array<dia.Element> = [];
    private leftPorts: Array<dia.Element> = [];
    private operators: Array<BlackBoxComponent> = [];
    private outerPadding = 120;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();

        this.subscribe();

        this.createIsolatedPorts();
        this.createOperators();
        this.createConnections();
        this.autoLayout();

        this.outer = this.createOuter();
        this.fitOuter();

        this.attachEventHandlers();

        // this.addOriginPoint();
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

            const link = new dia.Link({
                source: {
                    id: sourceIdentity,
                    port: connection.source.getIdentity()
                },
                target: {
                    id: destinationIdentity,
                    port: connection.destination.getIdentity()
                },
                router: slangRouter,
                connector: slangConnector,
                attrs: {
                    ".connection": {
                        stroke: "#777777",
                        "stroke-width": 2
                    }
                }
            });
            link.addTo(this.graph);
        }
    }

    private autoLayout() {
        layout.DirectedGraph.layout(this.graph, {
            nodeSep: 120,
            rankSep: 120,
            edgeSep: 360,
            rankDir: "TB",
            resizeClusters: false
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
