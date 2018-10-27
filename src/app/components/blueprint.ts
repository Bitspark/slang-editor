import {dia, layout} from "jointjs";
import {JointJSElements} from "../utils";
import {BlueprintModel} from "../model/blueprint";
import {OperatorModel} from "../model/operator";

export class BlueprintComponent {
    private outer: dia.Element;
    private outerPadding = 40;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();

        this.attachEventHandlers();
        this.subscribe();
        this.drawBlueprint();
        this.autoLayout();
        this.fitEmbedding();
        this.positionCenter();
    }

    private attachEventHandlers() {
        const that = this;
        
        this.graph.on('change:size', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {
            if (opt.skipParentHandler) return;
            
            if (cell.get('embeds') && cell.get('embeds').length) {
                cell.set('originalSize', cell.get('size'));
            }
        });

        this.graph.on('change:position', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {
            if (opt.skipParentHandler) return;

            if (cell.get('embeds') && cell.get('embeds').length) {
                cell.set('originalPosition', cell.get('position'));
            }

            const parentId = cell.get('parent');
            if (!parentId) return;

            const parent = that.graph.getCell(parentId);

            if (!parent.get('originalPosition')) parent.set('originalPosition', parent.get('position'));
            if (!parent.get('originalSize')) parent.set('originalSize', parent.get('size'));

            const originalPosition = parent.get('originalPosition');
            const originalSize = parent.get('originalSize');

            let newX = originalPosition.x;
            let newY = originalPosition.y;
            let newCornerX = originalPosition.x + originalSize.width;
            let newCornerY = originalPosition.y + originalSize.height;

            Array.from(parent.getEmbeddedCells()).forEach((child: dia.Element) => {
                const childBbox = child.getBBox();
                if (childBbox.x < (newX + that.outerPadding)) {
                    newX = (childBbox.x - that.outerPadding);
                }
                if (childBbox.y < (newY + that.outerPadding)) {
                    newY = (childBbox.y - that.outerPadding);
                }
                if (childBbox.corner().x > (newCornerX - that.outerPadding)) {
                    newCornerX = (childBbox.corner().x + that.outerPadding);
                }
                if (childBbox.corner().y > (newCornerY - that.outerPadding)) {
                    newCornerY = (childBbox.corner().y + that.outerPadding);
                }
            });

            parent.set({
                position: {x: newX, y: newY},
                size: {width: newCornerX - newX, height: newCornerY - newY}
            }, ({skipParentHandler: true} as any));
        });
    }

    private subscribe() {
        const that = this;
        this.blueprint.subscribeOperatorAdded(function (op: OperatorModel) {
            that.addOperator(op);
        });
    }

    private drawBlueprint() {
        const blueprint = this.blueprint;
        this.outer = JointJSElements.createPortOwnerElement(blueprint);
        this.outer.attr('body/fill', 'blue');
        this.outer.attr('body/fill-opacity', '.05');
        this.outer.addTo(this.graph);

        for (const op of blueprint.getOperators()) {
            this.addOperator(op);
        }

        this.drawConnections();
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
        this.outer.fitEmbeds({padding: this.outerPadding});
    }

    private positionCenter() {
        const position = this.outer.position();
        const bbox = this.outer.getBBox();
        this.outer.translate(-(position.x + bbox.width / 2), -(position.y + bbox.height / 2));
    }

    private addOperator(operator: OperatorModel) {
        const portOwnerElement = JointJSElements.createPortOwnerElement(operator);
        this.outer.embed(portOwnerElement);
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