import {dia, g, layout, shapes} from 'jointjs';
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {BlackBox, PortOwner} from "../../custom/nodes";
import {BlackBoxComponent, IsolatedBlueprintPort} from "./blackbox";

export class BlueprintComponent {
    private outer: dia.Element;
    private topPorts: Array<dia.Element> = [];
    private bottomPorts: Array<dia.Element> = [];
    private rightPorts: Array<dia.Element> = [];
    private leftPorts: Array<dia.Element> = [];
    private operators: Array<BlackBoxComponent> = [];
    private outerPadding = 80;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();

        this.attachEventHandlers();
        this.subscribe();

        this.outer = this.createOuter();
        this.createIsolatedPorts();
        this.createOperators();
        this.createConnections();

        this.autoLayout();
    }

    private attachEventHandlers() {
        const that = this;
        this.graph.on("change:position change:size", function (cell: dia.Cell) {
            if (!(cell instanceof BlackBoxComponent)) {
                return;
            }

            const padding = that.outerPadding;

            const currentPosition = that.outer.get("position");
            const currentSize = that.outer.get("size");

            let newX: number = currentPosition.x + padding;
            let newY: number = currentPosition.y + padding;
            let newCornerX: number = currentPosition.x + currentSize.width - 2 * padding;
            let newCornerY: number = currentPosition.y + currentSize.height - 2 * padding;

            that.operators.forEach((operator: BlackBoxComponent) => {
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
                that.outer.set(set);

                for (const port of that.topPorts) {
                    const currentPortPosition = port.get('position');
                    port.set({
                        position: {
                            x: currentPortPosition.x,
                            y: newPosition.y - 100,
                        }
                    });
                }
                
                for (const port of that.bottomPorts) {
                    const currentPortPosition = port.get('position');
                    port.set({
                        position: {
                            x: currentPortPosition.x,
                            y: newPosition.y + newSize.height,
                        }
                    });
                }

                that.rightPorts.forEach(port => {
                    const currentPortPosition = port.get('position');
                    port.set({
                        position: {
                            x: newPosition.x + newSize.width,
                            y: currentPortPosition.y,
                        }
                    });
                });
            }
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

        const outer = new (shapes.standard.Rectangle.define("BlueprintOuter", {}))({id: `${this.blueprint.getIdentity()}_outer}`});
        outer.attr("body/fill", "blue");
        outer.attr("body/fill-opacity", ".05");
        outer.attr("body/rx", "24");
        outer.attr("body/ry", "24");
        outer.set("obstacle", false);
        outer.set("size", size);
        outer.attr("draggable", false);
        outer.addTo(this.graph);

        return outer;
    }

    private createIsolatedPorts(): void {
        const that = this;
        
        // In
        const portInElement = new IsolatedBlueprintPort(`${this.blueprint.getShortName()} In-Port`, `${this.blueprint.getIdentity()}_in`, this.blueprint.getPortIn()!, "bottom");
        this.graph.addCell(portInElement);
        this.topPorts.push(portInElement);
        portInElement.set({position: {x: -50, y: 0}});
        portInElement.set("restrictTranslate", function (): g.PlainRect {
            const outerPosition = that.outer.get("position") as g.PlainPoint;
            const outerSize = that.outer.get("size") as g.PlainRect;
            const elementSize = portInElement.get("size") as g.PlainRect;
            return {x: outerPosition.x, y: outerPosition.y - elementSize.height, width: outerSize.width, height: elementSize.height};
        });

        // Out
        const portOutElement = new IsolatedBlueprintPort(`${this.blueprint.getShortName()} Out-Port`, `${this.blueprint.getIdentity()}_out`, this.blueprint.getPortOut()!, "top");
        this.graph.addCell(portOutElement);
        this.bottomPorts.push(portOutElement);
        portOutElement.set({position: {x: -50, y: 0}});
        portOutElement.set("restrictTranslate", function (): g.PlainRect {
            const outerPosition = that.outer.get("position") as g.PlainPoint;
            const outerSize = that.outer.get("size") as g.PlainRect;
            const elementSize = portOutElement.get("size") as g.PlainRect;
            return {x: outerPosition.x, y: outerPosition.y + outerSize.height, width: outerSize.width, height: elementSize.height};
        });

        // Delegates
        for (const delegate of this.blueprint.getDelegates()) {
            const portOutElement = new IsolatedBlueprintPort(`Delegate ${delegate.getName()}`, `${delegate.getIdentity()}_out`, delegate.getPortOut()!, "left");
            this.graph.addCell(portOutElement);
            this.rightPorts.push(portOutElement);
            portOutElement.set({position: {x: 0, y: -50}});
            portOutElement.set("restrictTranslate", function (): g.PlainRect {
                const outerPosition = that.outer.get("position") as g.PlainPoint;
                const outerSize = that.outer.get("size") as g.PlainRect;
                const elementSize = portOutElement.get("size") as g.PlainRect;
                return {x: outerPosition.x + outerSize.width, y: outerPosition.y, width: elementSize.width, height: outerSize.height};
            });
            
            const portInElement = new IsolatedBlueprintPort(`Delegate ${delegate.getName()}`, `${delegate.getIdentity()}_in`, delegate.getPortIn()!, "left");
            this.graph.addCell(portInElement);
            this.rightPorts.push(portInElement);
            portInElement.set({position: {x: 0, y: -50}});
            portInElement.set("restrictTranslate", function (): g.PlainRect {
                const outerPosition = that.outer.get("position") as g.PlainPoint;
                const outerSize = that.outer.get("size") as g.PlainRect;
                const elementSize = portInElement.get("size") as g.PlainRect;
                return {x: outerPosition.x + outerSize.width, y: outerPosition.y, width: elementSize.width, height: outerSize.height};
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
                router: { name: "manhattan", args: { maximumLoops: 1000, excludeTypes: ["BlueprintOuter"], step: 5 } },
                connector: { name: "rounded" },
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
        
        // Center ports
        
        const parentPosition = this.outer.get("position");
        const parentSize = this.outer.get("size");

        for (const port of this.topPorts) {
            port.set({
                position: {
                    x: parentPosition.x / 2 - 50 + parentSize.width / 2,
                    y: parentPosition.y - 100,
                }
            });
        }

        for (const port of this.bottomPorts) {
            port.set({
                position: {
                    x: parentPosition.x / 2 - 50 + parentSize.width / 2,
                    y: parentPosition.y + parentSize.height,
                }
            });
        }

        const offset = parentPosition.y + (parentSize.height - this.rightPorts.length * 100) / 2;
        this.rightPorts.forEach((port, index) => {
            port.set({
                position: {
                    x: parentPosition.x + parentSize.width,
                    y: offset + index * 100,
                }
            });
        });
    }

    private addOperator(operator: OperatorModel) {
        const operatorElement = new BlackBoxComponent(operator);
        operatorElement.set("obstacle", true);
        operatorElement.set('obstacle', true);
        this.graph.addCell(operatorElement);
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
                operatorElement.attr("body/fill", "orange");
            } else {
                operatorElement.attr("body/fill", "blue");
            }
        });
    }
}
