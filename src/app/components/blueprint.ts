import {BlueprintModel} from '../model/blueprint';
import {dia, shapes} from "jointjs";
import {redirectPaperEvents} from "./utils";
import {OperatorModel} from "../model/operator";

export class BlueprintComponent {
    private outer: dia.Element;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();
        this.attachEventHandlers();
        this.subscribe();
        this.drawBlueprint();
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
            console.log(" +++", op);
            that.addOperator(op);
        });
    }

    private drawBlueprint() {
        const bp = this.blueprint;
        this.outer = new shapes.standard.Rectangle({
            position: {x: 20, y: 20},
            size: {width: 400, height: 400},
            attrs: {
                body: {
                    fill: 'orange',
                    stroke: 'orange',
                },
                label: {
                    text: `${bp.getPackageName(0)}\n${bp.getShortName()}`,
                    fill: 'white',
                },
            }
        });
        this.outer.addTo(this.graph);

        for (const op of bp.getOperators()) {
            this.addOperator(op);
        }
    }

    private addOperator(operator: OperatorModel) {
        const rect = new shapes.standard.Rectangle();

        rect.position(100, 30);
        rect.resize(100, 40);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: operator.getFullName(),
                fill: 'white'
            }
        });
        this.outer.embed(rect);
        this.graph.addCell(rect);


        // JointJS -> Model
        rect.on('pointerclick', function (evt: Event, x: number, y: number) {
            operator.select();
        });

        // Model -> JointJS
        operator.subscribeDeleted(function () {
            rect.remove();
        });
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                rect.attr('body/fill', 'orange');
            } else {
                rect.attr('body/fill', 'blue');
            }
        });
    }
}