import {dia, layout, shapes} from "jointjs";
import {JointJSElements} from "../utils";
import {BlueprintModel} from "../model/blueprint";
import {OperatorModel} from "../model/operator";

export class BlueprintComponent {
    private outer: dia.Element;
    private outerParent: dia.Element;
    private outerPadding = 40;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();

        this.attachEventHandlers();
        this.subscribe();

        this.drawBlueprint();
        this.drawOperators();
        this.drawConnections();

        this.autoLayout();
        this.fitEmbedding();
        this.positionCenter();
    }

    private attachEventHandlers() {
        const that = this;

        this.graph.on('change:position', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {
            if (opt.skipParentHandler) return;

            if (cell === that.outer) {
                that.outerParent.set({
                    position: that.outer.position()
                });
            }
            
            const parentId = cell.get('parent');
            if (!parentId) return;

            const parent = that.graph.getCell(parentId);

            let newX: number | undefined = undefined;
            let newY: number | undefined = undefined;
            let newCornerX: number | undefined = undefined;
            let newCornerY: number | undefined = undefined;

            Array.from(parent.getEmbeddedCells()).forEach((child: dia.Element) => {
                const childBbox = child.getBBox();
                if (!newX || childBbox.x < (newX + that.outerPadding)) {
                    newX = (childBbox.x - that.outerPadding);
                }
                if (!newY || childBbox.y < (newY + that.outerPadding)) {
                    newY = (childBbox.y - that.outerPadding);
                }
                if (!newCornerX || childBbox.corner().x > (newCornerX - that.outerPadding)) {
                    newCornerX = (childBbox.corner().x + that.outerPadding);
                }
                if (!newCornerY || childBbox.corner().y > (newCornerY - that.outerPadding)) {
                    newCornerY = (childBbox.corner().y + that.outerPadding);
                }
            });
            
            if (typeof newX !== "undefined" &&
                typeof newY !== "undefined" &&
                typeof newCornerX !== "undefined" &&
                typeof newCornerY !== "undefined") {
                const set = {
                    position: {x: newX, y: newY},
                    size: {width: newCornerX - newX, height: newCornerY - newY}
                };
                parent.set(set, ({skipParentHandler: true} as any));
                if (parent === that.outerParent) {
                    that.outer.set(set);
                }
            }
        });
    }

    private subscribe() {
        const that = this;
        this.blueprint.subscribeOperatorAdded(function (op: OperatorModel) {
            that.addOperator(op);
        });
    }

    private drawBlueprint() {
        this.outer = JointJSElements.createPortOwnerElement(this.blueprint);
        this.outer.attr('body/fill', 'blue');
        this.outer.attr('body/fill-opacity', '.05');
        this.outer.addTo(this.graph);

        this.outerParent = new shapes.standard.Rectangle({});
        this.outerParent.attr('body/stroke-opacity', '0');
        this.outerParent.attr('body/fill-opacity', '0');
        this.outerParent.addTo(this.graph);
        
        const that = this;
        this.outer.on('change:position', function (cell: dia.Cell) {
            that.outer.set({
                position: cell.get('position')
            });
        });
        this.outerParent.on('change:position change:size', function (cell: dia.CellView) {
            const set = {
                size: that.outerParent.size()
            };
            that.outer.set(set, ({skipParentHandler: true} as any));
        });
    }

    private drawOperators() {
        for (const op of this.blueprint.getOperators()) {
            this.addOperator(op);
        }
    }

    private drawConnections() {
        for (const connection of this.blueprint.getConnections().getConnections()) {
            const link = new dia.Link({
                source: {
                    id: connection.source.getOwner()!.getIdentity(),
                    port: connection.source.getPortReferenceString()
                },
                target: {
                    id: connection.destination.getOwner()!.getIdentity(),
                    port: connection.destination.getPortReferenceString()
                },
                router: {
                    name: 'metro'
                },
                connector: {
                    name: 'rounded'
                },
                attrs: {
                    '.connection': {
                        stroke: '#777777',
                        'stroke-width': 2
                    }
                }
            });
            link.addTo(this.graph);
        }
    }

    private autoLayout() {
        layout.DirectedGraph.layout(this.graph, {
            nodeSep: 80,
            rankSep: 80,
            edgeSep: 240,
            rankDir: "TB"
        });
    }

    private fitEmbedding() {
        this.outerParent.fitEmbeds({padding: this.outerPadding});
    }

    private positionCenter() {
        const position = this.outerParent.position();
        const bbox = this.outerParent.getBBox();
        this.outerParent.translate(-(position.x + bbox.width / 2), -(position.y + bbox.height / 2));
    }

    private addOperator(operator: OperatorModel) {
        const portOwnerElement = JointJSElements.createPortOwnerElement(operator);
        this.outerParent.embed(portOwnerElement);
        this.graph.addCell(portOwnerElement);

        // JointJS -> Model
        portOwnerElement.on('pointerclick', function (evt: Event, x: number, y: number) {
            operator.select();
        });

        // Model -> JointJS
        operator.subscribeDeleted(function () {
            portOwnerElement.remove();
        });
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                portOwnerElement.attr('body/fill', 'orange');
            } else {
                portOwnerElement.attr('body/fill', 'blue');
            }
        });
    }
}