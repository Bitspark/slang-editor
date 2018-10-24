import {BlueprintModel} from '../model/blueprint';
import {dia, shapes} from "jointjs";
import {redirectPaperEvents} from "./utils";
import {OperatorModel} from "../model/operator";

export class BlueprintComponent {
    private graph = new dia.Graph();
    private paper: dia.Paper;
    private outer: dia.Element;

    constructor(private blueprint: BlueprintModel, private id: string) {
        this.createPaper(id);
        this.drawBlueprint();
        this.subscribe();
    }

    private createPaper(id: string) {
        const elem = document.getElementById(id);
        const newElem = document.createElement('div');
        const p = elem!.parentElement;
        newElem.id = id;
        elem!.remove();
        p!.appendChild(newElem);
        this.paper = new dia.Paper({
            el: document.getElementById(id),
            model: this.graph,
            width: 600,
            height: 600,
            gridSize: 10,
            drawGrid: {
                name: "fixedDot",
                color: "#000000",
            },
            background: {
                color: 'snow',
            }
        });
        redirectPaperEvents(this.paper);

        const that = this;
        this.graph.on('change:position', function (elem: dia.Element) {
            const parentId = elem.get('parent');
            if (!parentId) {
                return;
            }

            const parent = that.graph.getCell(parentId);
            const parentBbox = (parent as dia.Element).getBBox();
            const elemBbox = elem.getBBox();

            if (parentBbox.containsPoint(elemBbox.origin()) &&
                parentBbox.containsPoint(elemBbox.topRight()) &&
                parentBbox.containsPoint(elemBbox.corner()) &&
                parentBbox.containsPoint(elemBbox.bottomLeft())) {

                // All the four corners of the child are inside
                // the parent area.
                return;
            }

            // Revert the child position.
            elem.set('position', elem.previous('position'));
        });

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