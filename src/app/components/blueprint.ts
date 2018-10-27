import {dia, layout} from "jointjs";
import {JointJSElements} from "../utils";
import {BlueprintModel} from "../model/blueprint";
import {OperatorModel} from "../model/operator";
import {PortModel} from "../model/port";

export class BlueprintComponent {
    private outer: dia.Element;
    private outerPadding = 40;
    private portModelToElement: Map<PortModel, dia.Element.Port>;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        this.portModelToElement = new Map<PortModel, dia.Element.Port>();
        graph.clear();
        
        this.attachEventHandlers();
        this.subscribe();
        this.drawBlueprint();
        this.autoLayout();
    }

    private attachEventHandlers() {
        const that = this;
        /******* src: https://resources.jointjs.com/tutorial/hierarchy ********/
        this.graph.on('change:size', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {

            if (opt.skipParentHandler) return;

            if (cell.get('embeds') && cell.get('embeds').length) {
                // If we're manipulating a parent element, let's store
                // it's original size to a special property so that
                // we can shrink the parent element back while manipulating
                // its children.
                cell.set('originalSize', cell.get('size'));
            }
        });

        this.graph.on('change:position', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {

            if (opt.skipParentHandler) return;

            if (cell.get('embeds') && cell.get('embeds').length) {
                // If we're manipulating a parent element, let's store
                // it's original position to a special property so that
                // we can shrink the parent element back while manipulating
                // its children.
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

            // Note that we also pass a flag so that we know we shouldn't adjust the
            // `originalPosition` and `originalSize` in our handlers as a reaction
            // on the following `set()` call.
            parent.set({
                position: {x: newX, y: newY},
                size: {width: newCornerX - newX, height: newCornerY - newY}
            }, ({skipParentHandler: true} as any));
        });
        /*********/
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

        this.outer.fitEmbeds({padding: this.outerPadding});
    }
    
    private drawConnections() {
        for (const connection of this.blueprint.getConnections().getConnections()) {
            console.log(connection);
            const link = new dia.Link({
                source: {
                    id: connection.source.getOwner()!.getIdentity(),
                    port: connection.source.getPortReferenceString()
                },
                target: {
                    id: connection.destination.getOwner()!.getIdentity(),
                    port: connection.destination.getPortReferenceString()
                }
            });
            console.log(link);
            link.addTo(this.graph);
        }
    }
    
    private autoLayout() {
        const graphBBox = layout.DirectedGraph.layout(this.graph, {
            nodeSep: 50,
            edgeSep: 80,
            rankDir: "TB"
        });
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