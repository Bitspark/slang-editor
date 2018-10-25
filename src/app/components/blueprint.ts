import {BlueprintModel} from '../model/blueprint';
import {dia, shapes} from "jointjs";
import {JointJSElements} from "../utils";
import {OperatorModel} from "../model/operator";

export class BlueprintComponent {
    private outer: dia.Element;
    private outerPadding = 20;

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
        const bp = this.blueprint;
        this.outer = JointJSElements.createBlueprintElement(bp);
        this.outer.attr('body/fill', 'orange');
        this.outer.attr('body/fill-opacity', '.2');
        this.outer.addTo(this.graph);

        for (const op of bp.getOperators()) {
            this.addOperator(op);
        }

        this.outer.fitEmbeds({padding: this.outerPadding});
    }

    private addOperator(operator: OperatorModel) {
        const opElem = JointJSElements.createOperatorElement(operator);
        this.outer.embed(opElem);
        this.graph.addCell(opElem);


        // JointJS -> Model
        opElem.on('pointerclick', function (evt: Event, x: number, y: number) {
            operator.select();
        });

        // Model -> JointJS
        operator.subscribeDeleted(function () {
            opElem.remove();
        });
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                opElem.attr('body/fill', 'orange');
            } else {
                opElem.attr('body/fill', 'blue');
            }
        });
    }
}