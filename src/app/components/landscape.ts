import {dia, shapes} from 'jointjs';
import {Event} from 'jquery';

import {LandscapeModel} from '../model/landscape';
import {BlueprintModel} from '../model/blueprint';

export class LandscapeComponent {
    private graph = new dia.Graph();
    private paper: dia.Paper;

    constructor(landscape: LandscapeModel, id: string) {
        this.createPaper(id);
        this.subscribe(landscape);
    }

    private subscribe(landscape: LandscapeModel) {
        const that = this;
        landscape.subscribeBlueprintAdded(function (bp: BlueprintModel) {
            that.addBlueprint(bp);
        });
    }

    private createPaper(id: string) {
        this.paper = new dia.Paper({
            el: document.getElementById(id),
            model: this.graph,
            width: 800,
            height: 600,
            gridSize: 1
        });
        this.redirectPaperEvents(this.paper);
    }

    /**
     * Passes events triggered on a paper to the according cells.
     * @param paper to redirect events for
     */
    private redirectPaperEvents(paper: dia.Paper) {
        ['mousewheel'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
                    cellView.model.trigger(event, evt, x, y, delta);
                });
            })(event);
        });

        ['pointerdblclick', 'pointerclick', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
                    cellView.model.trigger(event, evt, x, y);
                });
            })(event);
        });

        ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event) {
                    cellView.model.trigger(event, evt);
                });
            })(event);
        });
    }

    public addBlueprint(blueprint: BlueprintModel) {
        const rect = new shapes.standard.Rectangle();

        rect.position(100, 30);
        rect.resize(100, 40);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: blueprint.getShortName(),
                fill: 'white'
            }
        });
        rect.addTo(this.graph);

        // JointJS -> Model
        rect.on('pointerclick', function (evt: Event, x: number, y: number) {
            blueprint.select();
        });
        rect.on('pointerdblclick', function (evt: Event, x: number, y: number) {
            blueprint.delete();
        });

        // Model -> JointJS
        blueprint.subscribeDeleted(function () {
            rect.remove();
        });
        blueprint.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                rect.attr('body/fill', 'orange');
            } else {
                rect.attr('body/fill', 'blue');
            }
        });
    }

}
